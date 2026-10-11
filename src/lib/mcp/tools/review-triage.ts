import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectBySlug, getAppBaseUrl, toolResult } from "@/lib/mcp/helpers";
import {
  FINDING_TYPES,
  RESOLUTION_STATUSES,
  upsertAdminReview,
} from "@/lib/reviews/upsert-admin-review";
import {
  MAX_NOTIFY_MESSAGE_LENGTH,
  buildReviewedEmailPlan,
  reviewedEmailSubject,
  sendReviewedEmails,
} from "@/lib/email/notify-testers";
import { getSenderBlockMessage } from "@/lib/email/sender-check";
import { getMcpAuthorLabel } from "@/lib/mcp/caller-context";
import {
  CODE_TTL_MS,
  createNotifyConfirmationCode,
  verifyNotifyConfirmationCode,
} from "@/lib/mcp/confirmation";

const MAX_REVIEWS_PER_CALL = 50;
const MAX_COMMENT_LENGTH = 2000;
const MAX_NOTIFY_RECIPIENTS = 50;

type ReviewSnapshot = {
  finding_type: string | null;
  resolution_status: string;
  comment: string | null;
};

export function registerReviewTriageTools(server: McpServer) {
  // ============================
  // TOOL: save_admin_reviews
  // ============================
  server.registerTool(
    "save_admin_reviews",
    {
      title: "Save Admin Reviews (triage)",
      description:
        "Triage tester findings on a UAT checklist: set the resolution status, finding type and/or admin comment for one or more of a tester's answered steps. Identify each item by the tester's email and the step number (both visible in get_admin_reviews / list_testers). Any field you leave out keeps its current value, so you can change only the status. Pass comment: \"\" to clear a comment. Statuses: Not Yet Started, In Progress, For Retesting, Done. Finding types: Expected Behavior, Bug/Glitch, Configuration Issue, User Error, Blocked. Changes are recorded in the review history, exactly like the admin screen. IMPORTANT: the comment is shown to the tester on their results page (as a 'Talkpush Response') and review data also feeds the client-facing analytics page, so write comments you are comfortable with testers and clients reading. This tool does NOT email anyone; use notify_testers for that. Max 50 items per call; each item is applied independently and the result lists what changed or failed.",
      inputSchema: {
        slug: z.string().describe("The UAT checklist slug"),
        reviews: z
          .array(
            z.object({
              tester_email: z
                .string()
                .describe("Email of a tester registered on this checklist"),
              step_number: z
                .number()
                .int()
                .describe("The step number the tester answered (as shown in get_admin_reviews)"),
              finding_type: z.enum(FINDING_TYPES).optional(),
              resolution_status: z.enum(RESOLUTION_STATUSES).optional(),
              comment: z
                .string()
                .max(MAX_COMMENT_LENGTH)
                .optional()
                .describe(
                  "Admin comment shown to the tester. Empty string clears it. Omit to leave it unchanged."
                ),
            })
          )
          .min(1)
          .max(MAX_REVIEWS_PER_CALL),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ slug, reviews }) => {
      const supabase = createAdminClient();
      const project = await getProjectBySlug(slug);

      const [{ data: testers }, { data: items }] = await Promise.all([
        supabase.from("testers").select("id, email").eq("project_id", project.id),
        supabase
          .from("checklist_items")
          .select("id, step_number")
          .eq("project_id", project.id)
          .eq("item_type", "step"),
      ]);

      const testerByEmail = new Map(
        (testers ?? []).map((t) => [t.email.trim().toLowerCase(), t.id])
      );
      const itemByStep = new Map(
        (items ?? []).filter((i) => i.step_number !== null).map((i) => [i.step_number as number, i.id])
      );
      const itemIds = (items ?? []).map((i) => i.id);

      // Only steps the tester actually answered can be reviewed, so a typo
      // can't create a review for a step nobody tested.
      const answered = new Set<string>();
      const existingReviews = new Map<string, ReviewSnapshot>();
      if (itemIds.length > 0) {
        const [{ data: responses }, { data: existing }] = await Promise.all([
          supabase
            .from("responses")
            .select("tester_id, checklist_item_id, status")
            .in("checklist_item_id", itemIds),
          supabase
            .from("admin_reviews")
            .select("tester_id, checklist_item_id, finding_type, resolution_status, notes")
            .in("checklist_item_id", itemIds),
        ]);
        for (const r of responses ?? []) {
          if (r.status !== null) answered.add(`${r.tester_id}::${r.checklist_item_id}`);
        }
        for (const r of existing ?? []) {
          existingReviews.set(`${r.tester_id}::${r.checklist_item_id}`, {
            finding_type: r.finding_type,
            resolution_status: r.resolution_status,
            comment: r.notes,
          });
        }
      }

      const seen = new Set<string>();
      const results: Array<Record<string, unknown>> = [];

      for (const review of reviews) {
        const label = { tester_email: review.tester_email, step_number: review.step_number };
        const fail = (error: string) => results.push({ ...label, status: "error", error });

        const testerId = testerByEmail.get(review.tester_email.trim().toLowerCase());
        if (!testerId) {
          fail("No tester with this email is registered on this checklist");
          continue;
        }
        const itemId = itemByStep.get(review.step_number);
        if (!itemId) {
          fail(`This checklist has no step number ${review.step_number}`);
          continue;
        }
        if (
          review.finding_type === undefined &&
          review.resolution_status === undefined &&
          review.comment === undefined
        ) {
          fail("Nothing to change: provide finding_type, resolution_status and/or comment");
          continue;
        }
        const key = `${testerId}::${itemId}`;
        if (seen.has(key)) {
          fail("Duplicate of another item in this request");
          continue;
        }
        seen.add(key);
        if (!answered.has(key)) {
          fail("This tester has not answered this step, so there is nothing to review");
          continue;
        }

        const before: ReviewSnapshot = existingReviews.get(key) ?? {
          finding_type: null,
          resolution_status: "Not Yet Started",
          comment: null,
        };
        const nextComment =
          review.comment === undefined ? before.comment : review.comment.trim() || null;
        const after: ReviewSnapshot = {
          finding_type: review.finding_type ?? before.finding_type,
          resolution_status: review.resolution_status ?? before.resolution_status,
          comment: nextComment,
        };

        if (
          after.finding_type === before.finding_type &&
          after.resolution_status === before.resolution_status &&
          after.comment === before.comment
        ) {
          results.push({ ...label, status: "unchanged", current: after });
          continue;
        }

        const saved = await upsertAdminReview(supabase, {
          checklistItemId: itemId,
          testerId,
          findingType: after.finding_type,
          resolutionStatus: after.resolution_status,
          notes: after.comment,
          changedBy: getMcpAuthorLabel(),
        });
        if (saved.error) {
          fail(saved.error);
          continue;
        }
        results.push({ ...label, status: "updated", before, after });
      }

      const updated = results.filter((r) => r.status === "updated").length;
      if (updated > 0) {
        // Same pages the admin screen refreshes after a save.
        try {
          revalidatePath(`/admin/projects/${slug}/review`);
          revalidatePath(`/share/analytics/${slug}`, "layout");
        } catch (err) {
          console.error("save_admin_reviews: revalidate failed:", err instanceof Error ? err.message : err);
        }
      }

      return toolResult({
        project_slug: slug,
        updated,
        unchanged: results.filter((r) => r.status === "unchanged").length,
        failed: results.filter((r) => r.status === "error").length,
        results,
      });
    }
  );

  // ========================
  // TOOL: notify_testers
  // ========================
  server.registerTool(
    "notify_testers",
    {
      title: "Notify Testers (email) — two steps",
      description:
        "Email testers their review results (\"Your UAT results have been reviewed\", with their issue counts and a link to their results page). SENDS REAL EMAIL TO EXTERNAL PEOPLE, so it works in two steps. STEP 1: call WITHOUT confirmation_code. Nothing is sent; you get the exact recipients, their issue counts, the optional note, and a confirmation_code valid for 10 minutes. Show the user the recipients and note and ask for explicit approval. STEP 2: only after the user approves, call again with the SAME slug, tester_emails and message plus that confirmation_code to send. Changing the recipients or the note, or waiting more than 10 minutes, invalidates the code (start again from step 1). Do not call step 2 again to retry a send without checking with the user, as the same code could send the emails twice. Omit tester_emails to email every registered tester on the checklist (max 50). The optional message (max 1000 chars) appears in every email as a note from the Talkpush team.",
      inputSchema: {
        slug: z.string().describe("The UAT checklist slug"),
        tester_emails: z
          .array(z.string())
          .max(MAX_NOTIFY_RECIPIENTS)
          .optional()
          .describe("Emails of the testers to notify. Omit to notify every registered tester."),
        message: z
          .string()
          .max(MAX_NOTIFY_MESSAGE_LENGTH)
          .optional()
          .describe("Optional note shown in every email."),
        confirmation_code: z
          .string()
          .optional()
          .describe("The code returned by the preview call. Present only to actually send."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ slug, tester_emails, message, confirmation_code }) => {
      const brevoKey = process.env.BREVO_API_KEY;
      if (!brevoKey) throw new Error("Email is not configured (BREVO_API_KEY is missing)");

      const supabase = createAdminClient();
      const project = await getProjectBySlug(slug);

      // Resolve the optional email list to tester ids.
      let testerIds: string[] | null = null;
      if (tester_emails) {
        const { data: testers } = await supabase
          .from("testers")
          .select("id, email")
          .eq("project_id", project.id);
        const byEmail = new Map((testers ?? []).map((t) => [t.email.trim().toLowerCase(), t.id]));
        const unknown = tester_emails.filter((e) => !byEmail.has(e.trim().toLowerCase()));
        if (unknown.length > 0) {
          throw new Error(
            `These emails are not registered testers on this checklist: ${unknown.join(", ")}`
          );
        }
        testerIds = Array.from(new Set(tester_emails.map((e) => byEmail.get(e.trim().toLowerCase())!)));
      }

      const plan = await buildReviewedEmailPlan(supabase, slug, testerIds);
      if (!plan) throw new Error(`UAT checklist not found: ${slug}`);

      if (plan.recipients.length === 0) {
        return toolResult({
          mode: "preview",
          sends_email: false,
          project_slug: slug,
          recipients: [],
          note: "There are no testers to email for this checklist.",
        });
      }
      if (plan.recipients.length > MAX_NOTIFY_RECIPIENTS) {
        throw new Error(
          `That would email ${plan.recipients.length} testers; the limit is ${MAX_NOTIFY_RECIPIENTS} per send. Pass tester_emails to narrow it.`
        );
      }

      const cleanMessage = (message ?? "").trim().slice(0, MAX_NOTIFY_MESSAGE_LENGTH);
      const confirmInput = {
        slug,
        testerIds: plan.recipients.map((r) => r.testerId),
        message: cleanMessage,
      };

      // ---- Step 1: preview (sends nothing) ----
      if (!confirmation_code) {
        // Don't hand out a code for a send that Brevo would reject afterwards.
        const blocked = await getSenderBlockMessage(brevoKey);
        if (blocked) {
          return { ...toolResult({ mode: "blocked", sends_email: false, error: blocked }), isError: true };
        }
        return toolResult({
          mode: "preview",
          sends_email: false,
          project_slug: slug,
          checklist: plan.project.company_name,
          subject: reviewedEmailSubject(plan.project.company_name),
          note_included: cleanMessage || null,
          recipient_count: plan.recipients.length,
          recipients: plan.recipients.map((r) => ({
            name: r.name,
            email: r.email,
            issues: r.totalIssues,
            resolved: r.resolvedCount,
            in_progress: r.inProgressCount,
            ready_to_retest: r.retestCount,
            pending: r.pendingCount,
          })),
          confirmation_code: createNotifyConfirmationCode(confirmInput),
          code_valid_minutes: CODE_TTL_MS / 60000,
          next_step:
            "Nothing has been sent. Show the user these recipients (and the note) and ask for explicit approval. Only if they approve, call notify_testers again with the same slug, tester_emails and message, plus this confirmation_code.",
        });
      }

      // ---- Step 2: verify the code, then send ----
      const check = verifyNotifyConfirmationCode(confirmation_code, confirmInput);
      if (!check.valid) {
        const why =
          check.reason === "expired"
            ? "The confirmation code has expired."
            : "The confirmation code does not match this checklist, these recipients and this note.";
        return {
          ...toolResult({
            mode: "refused",
            sent: 0,
            error: `${why} Nothing was sent. Call notify_testers again without a confirmation_code to get a fresh preview.`,
          }),
          isError: true,
        };
      }

      const { sent, errors, blocked } = await sendReviewedEmails(brevoKey, plan, {
        message: cleanMessage,
        baseUrl: getAppBaseUrl(),
      });
      if (blocked) {
        return { ...toolResult({ mode: "blocked", sent: 0, error: blocked }), isError: true };
      }

      return toolResult({
        mode: "sent",
        project_slug: slug,
        sent,
        failed: errors.length,
        errors,
        recipients_emailed: plan.recipients.map((r) => r.email),
        note:
          "Brevo accepted these for sending. Later delivery problems (such as a bounced address) are reported by Brevo afterwards and are not visible here.",
      });
    }
  );
}
