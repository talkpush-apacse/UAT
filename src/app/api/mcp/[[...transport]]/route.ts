import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateUniqueProjectSlug } from "@/lib/utils/project-slug";
import { generateShareToken } from "@/lib/utils/share-token";

// --- Helper ---
async function getProjectBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) throw new Error(`UAT checklist not found: ${slug}`);
  return data;
}

function getAppBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://uat.talkpush.com").replace(
    /\/+$/,
    ""
  );
}

// Every tool below declares an `outputSchema`, which per the MCP spec means
// the result MUST include a matching `structuredContent` object — a plain
// `content` text block alone gets rejected by the client with "Tool has an
// output schema but no structured content was provided". This wraps both in
// one place so `data` always ends up in both fields, consistently.
function toolResult(data: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

// --- MCP Handler ---
const handler = createMcpHandler(
  (server) => {
    // ============================================================
    // TOOL: search (required by ChatGPT MCP Apps spec)
    // Returns matching UAT checklists as {id, title, url} results.
    // ChatGPT and Claude.ai both support this; domain-specific tools
    // below (list_uat_checklists, get_uat_checklist, etc.) still work as before.
    // ============================================================
    server.registerTool(
      "search",
      {
        title: "Search UAT Checklists",
        description:
          "Search UAT checklists by query string. Matches against checklist title and company name. Returns up to 20 results with id, title, and public URL. Use this for quick lookups; use get_uat_checklist for full detail.",
        inputSchema: {
          query: z
            .string()
            .describe(
              "Search query — matches UAT checklist title or company name (case-insensitive, partial match)"
            ),
        },
        outputSchema: {
          results: z
            .array(
              z.object({
                id: z.string().describe("UAT checklist slug — pass this as `id` to the fetch tool"),
                title: z.string().describe("Display title formatted as 'Company — Checklist Title'"),
                url: z.string().describe("Public tester URL for the UAT checklist"),
              })
            )
            .describe("Matching UAT checklists, up to 20, ordered by creation date descending"),
        },
      },
      async ({ query }) => {
        const supabase = createAdminClient();
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://uat.talkpush.com";

        const q = query.trim();
        const { data, error } = await supabase
          .from("projects")
          .select("slug, company_name, title, test_scenario")
          .or(`title.ilike.%${q}%,company_name.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw new Error(error.message);

        const results = (data ?? []).map((p) => ({
          id: p.slug,
          title: `${p.company_name} — ${p.title}`,
          url: `${baseUrl}/test/${p.slug}`,
        }));

        return toolResult({ results });
      }
    );

    // ============================================================
    // TOOL: fetch (required by ChatGPT MCP Apps spec)
    // Takes an id (UAT checklist slug) and returns full checklist detail
    // including its UAT steps as a structured text document.
    // ============================================================
    server.registerTool(
      "fetch",
      {
        title: "Fetch UAT Checklist Document",
        description:
          "Fetch full details of a UAT checklist by id (the checklist slug). Returns checklist metadata, test scenario, and all UAT steps as a single document. Use this after search to retrieve full content.",
        inputSchema: {
          id: z
            .string()
            .describe(
              "The UAT checklist id (slug) returned from the search tool"
            ),
        },
        outputSchema: {
          id: z.string().describe("UAT checklist slug"),
          title: z.string().describe("Display title formatted as 'Company — Checklist Title'"),
          text: z.string().describe("Full UAT checklist document as markdown-formatted text including test scenario and all UAT steps"),
          url: z.string().describe("Public tester URL for the UAT checklist"),
          metadata: z.object({
            company_name: z.string(),
            project_title: z.string().nullable(),
            slug: z.string(),
            created_at: z.string().nullable().describe("ISO 8601 timestamp"),
            total_steps: z.number().describe("Number of testable UAT steps (phase headers excluded)"),
          }),
        },
      },
      async ({ id }) => {
        const supabase = createAdminClient();
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://uat.talkpush.com";

        const project = await getProjectBySlug(id);

        const { data: items, error: itemsError } = await supabase
          .from("checklist_items")
          .select(
            "step_number, actor, action, path, crm_module, tip, view_sample"
          )
          .eq("project_id", project.id)
          .order("sort_order", { ascending: true });

        if (itemsError) throw new Error(itemsError.message);

        // Build a readable text document for the LLM
        const lines: string[] = [];
        lines.push(`# ${project.company_name} — ${project.title}`);
        lines.push("");
        if (project.test_scenario) {
          lines.push(`## Test Scenario`);
          lines.push(project.test_scenario);
          lines.push("");
        }
        lines.push(`## UAT Steps (${items?.length ?? 0} steps)`);
        (items ?? []).forEach((it) => {
          lines.push(`### Step ${it.step_number} — ${it.actor}`);
          lines.push(it.action);
          if (it.path) lines.push(`- Path: ${it.path}`);
          if (it.crm_module) lines.push(`- CRM Module: ${it.crm_module}`);
          if (it.tip) lines.push(`- Tip: ${it.tip}`);
          if (it.view_sample) lines.push(`- View Sample: ${it.view_sample}`);
          lines.push("");
        });

        const document = {
          id: project.slug,
          title: `${project.company_name} — ${project.title}`,
          text: lines.join("\n"),
          url: `${baseUrl}/test/${project.slug}`,
          metadata: {
            company_name: project.company_name,
            project_title: project.title,
            slug: project.slug,
            created_at: project.created_at,
            total_steps: items?.length ?? 0,
          },
        };

        return toolResult(document);
      }
    );

    // ===========================
    // TOOL 1: list_uat_checklists
    // ===========================
    server.registerTool(
      "list_uat_checklists",
      {
        title: "List UAT Checklists",
        description:
          "List all UAT checklists. Optionally filter by company name.",
        inputSchema: {
          company: z
            .string()
            .optional()
            .describe("Filter by company name (case-insensitive partial match). Omit to return all UAT checklists."),
        },
        outputSchema: {
          count: z.number().describe("Total number of UAT checklists returned"),
          projects: z.array(
            z.object({
              id: z.string().describe("Internal UUID"),
              slug: z.string().describe("URL-friendly identifier used in all other tools"),
              company_name: z.string(),
              title: z.string().nullable(),
              test_scenario: z.string().nullable(),
              created_at: z.string().nullable().describe("ISO 8601 timestamp"),
            })
          ),
        },
      },
      async ({ company }) => {
        const supabase = createAdminClient();
        let query = supabase
          .from("projects")
          .select("id, slug, company_name, title, test_scenario, created_at")
          .order("created_at", { ascending: false });

        if (company) query = query.ilike("company_name", `%${company}%`);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return toolResult({ count: data.length, projects: data });
      }
    );

    // =============================
    // TOOL 2: create_uat_checklist
    // =============================
    server.registerTool(
      "create_uat_checklist",
      {
        title: "Create UAT Checklist",
        description:
          "Create a new UAT checklist. Generates a URL-friendly slug from the title automatically.",
        inputSchema: {
          company_name: z
            .string()
            .describe("The client/company name (e.g., 'Accenture')"),
          title: z
            .string()
            .describe("The UAT checklist title (e.g., 'ERP Link Generator UAT')"),
          test_scenario: z
            .string()
            .optional()
            .describe("Description of what is being tested (optional)"),
          talkpush_login_link: z
            .string()
            .optional()
            .describe("Talkpush login link for the UAT checklist (optional)"),
          country: z
            .string()
            .regex(/^[A-Za-z]{2}$/)
            .optional()
            .describe("ISO 3166-1 alpha-2 country code for the tester phone input default (e.g. 'PH', 'IN', 'US'). Defaults to 'PH'."),
        },
        outputSchema: {
          created: z.literal(true),
          project: z.object({
            id: z.string().describe("Internal UUID"),
            slug: z.string().describe("Auto-generated URL-friendly identifier"),
            company_name: z.string(),
            title: z.string().nullable(),
            test_scenario: z.string().nullable(),
            talkpush_login_link: z.string().nullable(),
            country: z.string().describe("Uppercase ISO 3166-1 alpha-2 code"),
            created_at: z.string().nullable().describe("ISO 8601 timestamp"),
            wizard_mode: z.boolean().describe("When true, tester sees one step at a time"),
          }),
        },
      },
      async ({ company_name, title, test_scenario, talkpush_login_link, country }) => {
        const supabase = createAdminClient();
        const slug = await generateUniqueProjectSlug(supabase, title);

        const { data, error } = await supabase
          .from("projects")
          .insert({
            company_name,
            title,
            test_scenario: test_scenario ?? null,
            talkpush_login_link: talkpush_login_link ?? null,
            country: country ? country.toUpperCase() : "PH",
            slug,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        return toolResult({ created: true, project: data });
      }
    );

    // =============================
    // TOOL 2A: update_uat_checklist
    // =============================
    server.registerTool(
      "update_uat_checklist",
      {
        title: "Update UAT Checklist",
        description:
          "Edit checklist-level metadata on an existing UAT checklist. Identifies the checklist by slug. Only fields explicitly passed are updated.",
        inputSchema: {
          slug: z
            .string()
            .min(1)
            .describe("The UAT checklist slug (URL identifier)"),
          title: z
            .string()
            .min(1)
            .max(300)
            .optional()
            .describe("Replacement UAT checklist title (1–300 chars). Only pass if changing."),
          company_name: z
            .string()
            .min(1)
            .max(200)
            .optional()
            .describe("Replacement client/company name (1–200 chars). Only pass if changing."),
          test_scenario: z
            .string()
            .max(2000)
            .optional()
            .describe("Replacement description of what is being tested (max 2000 chars). Pass an empty string to clear it."),
          talkpush_login_link: z
            .union([z.string().url().max(500), z.literal("")])
            .optional()
            .describe("Replacement Talkpush login URL (max 500 chars). Pass an empty string to clear it."),
          country: z
            .string()
            .regex(/^[A-Za-z]{2}$/)
            .optional()
            .describe("Replacement ISO 3166-1 alpha-2 country code (e.g. 'PH', 'IN', 'US'). Only pass if changing."),
        },
      },
      async ({
        slug,
        title,
        company_name,
        test_scenario,
        talkpush_login_link,
        country,
      }) => {
        const supabase = createAdminClient();

        const cleanUpdates: Record<string, string | null> = {};

        if (title !== undefined) cleanUpdates.title = title;
        if (company_name !== undefined) cleanUpdates.company_name = company_name;
        if (test_scenario !== undefined) {
          cleanUpdates.test_scenario = test_scenario || null;
        }
        if (talkpush_login_link !== undefined) {
          cleanUpdates.talkpush_login_link = talkpush_login_link || null;
        }
        if (country !== undefined) cleanUpdates.country = country.toUpperCase();

        if (Object.keys(cleanUpdates).length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    updated: false,
                    error:
                      "No fields to update. Pass at least one of: title, company_name, test_scenario, talkpush_login_link, country",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const { data: existingProject, error: lookupError } = await supabase
          .from("projects")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (lookupError) throw new Error(lookupError.message);

        if (!existingProject) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    updated: false,
                    error: "UAT checklist not found",
                    slug,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const { data, error } = await supabase
          .from("projects")
          .update(cleanUpdates)
          .eq("id", existingProject.id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ updated: true, project: data }, null, 2),
            },
          ],
        };
      }
    );

    // ===========================
    // TOOL 3: get_uat_checklist
    // ===========================
    server.registerTool(
      "get_uat_checklist",
      {
        title: "Get UAT Checklist Details",
        description: "Get full details of a UAT checklist by its slug.",
        inputSchema: {
          slug: z.string().describe("The UAT checklist slug (URL identifier)"),
        },
        outputSchema: {
          id: z.string().describe("Internal UUID"),
          slug: z.string(),
          company_name: z.string(),
          title: z.string().nullable(),
          test_scenario: z.string().nullable(),
          talkpush_login_link: z.string().nullable(),
          country: z.string().describe("Uppercase ISO 3166-1 alpha-2 code"),
          created_at: z.string().nullable().describe("ISO 8601 timestamp"),
          wizard_mode: z.boolean().describe("When true, tester sees one step at a time"),
        },
      },
      async ({ slug }) => {
        const project = await getProjectBySlug(slug);
        return toolResult(project);
      }
    );

    // ===========================
    // TOOL 3A: get_share_link
    // ===========================
    server.registerTool(
      "get_share_link",
      {
        title: "Get Share Link",
        description:
          "Returns a public, read-only share link for the UAT checklist's results — safe to send to clients.",
        inputSchema: {
          slug: z.string().describe("The UAT checklist slug"),
        },
        outputSchema: {
          share_url: z.string().describe("Fully-qualified public URL — safe to send to clients; no login required"),
          slug: z.string(),
          expires_at: z.null().describe("Always null — share links do not expire"),
        },
      },
      async ({ slug }) => {
        const project = await getProjectBySlug(slug);
        const token = await generateShareToken(project.slug);
        const shareUrl = `${getAppBaseUrl()}/share/analytics/${project.slug}/${token}`;

        return toolResult({
          share_url: shareUrl,
          slug: project.slug,
          expires_at: null,
        });
      }
    );

    // =====================
    // TOOL 4: get_uat_steps
    // =====================
    server.registerTool(
      "get_uat_steps",
      {
        title: "Get UAT Steps",
        description:
          "Get all UAT steps for a checklist, ordered by sort_order.",
        inputSchema: {
          slug: z.string().describe("The UAT checklist slug"),
        },
        outputSchema: {
          project_slug: z.string(),
          project_title: z.string().nullable(),
          total_steps: z.number().describe("Count of items returned (includes both steps and phase headers)"),
          items: z.array(
            z.object({
              id: z.string().describe("UUID — use this in update_uat_step, delete_uat_steps, and reorder_uat_steps"),
              actor: z.string().describe("Who performs this step: Candidate, Talkpush, Recruiter, or Referrer/Vendor"),
              action: z.string().describe("Instruction text shown to the tester"),
              path: z.string().nullable().describe("URL path or app location for this step"),
              crm_module: z.string().nullable(),
              tip: z.string().nullable().describe("Optional helper text shown to testers"),
              view_sample: z.string().nullable().describe("URL to a sample screenshot"),
              sort_order: z.number().describe("1-based display position; drives ordering"),
              step_number: z.number().nullable().describe("Sequential number shown to testers; null for phase_header items"),
              item_type: z.string().describe("'step' (testable) or 'phase_header' (section label only)"),
              header_label: z.string().nullable().describe("Short uppercase label for phase_header items (e.g. 'PHASE 1'); null for steps"),
            })
          ),
        },
      },
      async ({ slug }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        const { data, error } = await supabase
          .from("checklist_items")
          .select(
            "id, actor, action, path, crm_module, tip, view_sample, sort_order, step_number, item_type, header_label"
          )
          .eq("project_id", project.id)
          .order("sort_order", { ascending: true });

        if (error) throw new Error(error.message);

        return toolResult({
          project_slug: slug,
          project_title: project.title,
          total_steps: data.length,
          items: data,
        });
      }
    );

    // ==========================
    // TOOL 5: create_uat_steps
    // ==========================
    server.registerTool(
      "create_uat_steps",
      {
        title: "Create UAT Steps",
        description:
          "Add new UAT steps or section headers to a checklist. Auto-increments sort_order; step_number is sequential for testable steps and NULL for section headers.",
        inputSchema: {
          slug: z.string().describe("The UAT checklist slug"),
          items: z
            .array(
              z.object({
                item_type: z
                  .enum(["step", "phase_header"])
                  .default("step")
                  .describe(
                    "'step' (default) creates a testable UAT step; 'phase_header' creates a non-testable section header (UI label: Section Header)"
                  ),
                actor: z
                  .enum([
                    "Candidate",
                    "Talkpush",
                    "Recruiter",
                    "Referrer/Vendor",
                  ])
                  .optional()
                  .describe("Who performs this step (required for 'step', ignored for section headers)"),
                action: z
                  .string()
                  .describe(
                    "For a step: what the actor does. For a section header: the title and description text."
                  ),
                path: z
                  .string()
                  .optional()
                  .describe("URL path or location in the app (steps only)"),
                crm_module: z
                  .string()
                  .optional()
                  .describe("CRM module name (steps only)"),
                tip: z
                  .string()
                  .optional()
                  .describe("Helpful tip displayed to testers (optional)"),
                view_sample: z
                  .string()
                  .optional()
                  .describe("URL to a sample/screenshot (steps only)"),
                header_label: z
                  .string()
                  .optional()
                  .describe(
                    "Short uppercase label for a section header (e.g. 'PHASE 1' or 'SECTION A'). Ignored for steps."
                  ),
              })
            )
            .describe("Array of UAT steps to create"),
        },
        outputSchema: {
          created: z.number().describe("Count of items successfully inserted"),
          project_slug: z.string(),
          items: z.array(
            z.object({
              id: z.string().describe("UUID of the newly created item"),
              project_id: z.string().describe("Internal UAT checklist UUID"),
              actor: z.string(),
              action: z.string(),
              path: z.string().nullable(),
              crm_module: z.string().nullable(),
              tip: z.string().nullable(),
              view_sample: z.string().nullable(),
              sort_order: z.number(),
              step_number: z.number().nullable().describe("Sequential step number after renumbering; null for phase_header items"),
              item_type: z.string(),
              header_label: z.string().nullable(),
            })
          ),
        },
      },
      async ({ slug, items }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        // Get current max sort_order. step_number is renumbered server-side
        // by the renumber_steps RPC after insert, so we don't need to track
        // it precisely here — just provide a temporary unique value for steps.
        const { data: existing } = await supabase
          .from("checklist_items")
          .select("sort_order, step_number")
          .eq("project_id", project.id)
          .order("sort_order", { ascending: false })
          .limit(1);

        let nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
        let nextStep = (existing?.[0]?.step_number ?? 0) + 1;

        const rows = items.map((item) => {
          const isHeader = item.item_type === "phase_header";
          return {
            project_id: project.id,
            // Phase headers borrow the actor column with a placeholder so the
            // existing NOT NULL constraint is satisfied; the UI ignores it.
            actor: isHeader ? item.actor ?? "Talkpush" : item.actor!,
            action: item.action,
            path: isHeader ? null : item.path ?? null,
            crm_module: isHeader ? null : item.crm_module ?? null,
            tip: item.tip ?? null,
            view_sample: isHeader ? null : item.view_sample ?? null,
            sort_order: nextOrder++,
            step_number: isHeader ? null : nextStep++,
            item_type: item.item_type ?? "step",
            header_label: isHeader ? item.header_label ?? null : null,
          };
        });

        const { data, error } = await supabase
          .from("checklist_items")
          .insert(rows)
          .select();

        if (error) throw new Error(error.message);

        // Renumber so step_numbers are sequential 1..N over steps only,
        // and phase headers stay at NULL.
        await supabase.rpc("renumber_steps", { p_project_id: project.id });

        return toolResult({
          created: data.length,
          project_slug: slug,
          items: data,
        });
      }
    );

    // ==============================
    // TOOL 6: update_uat_step
    // ==============================
    server.registerTool(
      "update_uat_step",
      {
        title: "Update UAT Step",
        description: "Edit a specific UAT step by its ID.",
        inputSchema: {
          id: z.string().uuid().describe("The UAT step UUID"),
          actor: z
            .enum(["Candidate", "Talkpush", "Recruiter", "Referrer/Vendor"])
            .optional()
            .describe("Replacement actor role — who performs this step. Only pass if changing."),
          action: z.string().optional().describe("Replacement instruction text shown to the tester. Only pass if changing."),
          path: z.string().optional().describe("Replacement URL path or app location for this step. Only pass if changing."),
          crm_module: z.string().optional().describe("Replacement CRM module name where this step is performed. Only pass if changing."),
          tip: z.string().optional().describe("Replacement helper text displayed to testers. Only pass if changing."),
          view_sample: z.string().optional().describe("Replacement URL to a screenshot or sample demonstrating the expected result. Only pass if changing."),
          item_type: z
            .enum(["step", "phase_header"])
            .optional()
            .describe(
              "Convert between testable step and section header. When switching to phase_header, step_number is cleared."
            ),
          header_label: z
            .string()
            .optional()
            .describe(
              "Short uppercase label for a section header (e.g. 'PHASE 1' or 'SECTION A'). Ignored when item_type is 'step'."
            ),
        },
        outputSchema: {
          updated: z.literal(true),
          item: z.object({
            id: z.string(),
            project_id: z.string().describe("Internal UAT checklist UUID"),
            actor: z.string(),
            action: z.string(),
            path: z.string().nullable(),
            crm_module: z.string().nullable(),
            tip: z.string().nullable(),
            view_sample: z.string().nullable(),
            sort_order: z.number(),
            step_number: z.number().nullable().describe("Recomputed sequential number; null for phase_header items"),
            item_type: z.string(),
            header_label: z.string().nullable(),
          }),
        },
      },
      async ({ id, ...updates }) => {
        const supabase = createAdminClient();
        // Remove undefined values
        const cleanUpdates: Record<string, unknown> = Object.fromEntries(
          Object.entries(updates).filter(([, v]) => v !== undefined)
        );

        // Switching to phase_header forces step_number to NULL so the partial
        // unique index doesn't trip and the row matches the header invariant.
        if (cleanUpdates.item_type === "phase_header") {
          cleanUpdates.step_number = null;
        }

        if (Object.keys(cleanUpdates).length === 0) {
          throw new Error("No fields provided to update");
        }

        // Resolve project_id before updating if item_type is changing so we
        // can renumber after — a step→header removes one numbered slot and a
        // header→step adds one, so remaining steps need to shift.
        let projectId: string | undefined;
        if ("item_type" in cleanUpdates) {
          const { data: existing } = await supabase
            .from("checklist_items")
            .select("project_id")
            .eq("id", id)
            .single();
          projectId = existing?.project_id;
        }

        const { data, error } = await supabase
          .from("checklist_items")
          .update(cleanUpdates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        if (projectId) {
          await supabase.rpc("renumber_steps", { p_project_id: projectId });
        }

        return toolResult({ updated: true, item: data });
      }
    );

    // ==========================
    // TOOL 7: delete_uat_steps
    // ==========================
    server.registerTool(
      "delete_uat_steps",
      {
        title: "Delete UAT Steps",
        description: "Delete one or more UAT steps by their IDs.",
        inputSchema: {
          ids: z
            .array(z.string().uuid())
            .describe("Array of UAT step UUIDs to delete"),
        },
        outputSchema: {
          deleted: z.number().describe("Count of items deleted"),
          ids: z.array(z.string()).describe("The UUIDs that were deleted"),
        },
      },
      async ({ ids }) => {
        const supabase = createAdminClient();

        // Resolve project_id before deleting so we can renumber afterward
        const { data: first } = await supabase
          .from("checklist_items")
          .select("project_id")
          .eq("id", ids[0])
          .single();

        const projectId = first?.project_id;

        const { error } = await supabase
          .from("checklist_items")
          .delete()
          .in("id", ids);

        if (error) throw new Error(error.message);

        // Renumber remaining steps so there are no gaps after deletion
        if (projectId) {
          await supabase.rpc("renumber_steps", { p_project_id: projectId });
        }

        return toolResult({ deleted: ids.length, ids });
      }
    );

    // ==========================
    // TOOL 8: reorder_uat_steps
    // ==========================
    server.registerTool(
      "reorder_uat_steps",
      {
        title: "Reorder UAT Steps",
        description:
          "Reorder UAT steps by providing an array of IDs in the desired order. Updates sort_order and recomputes step_number for all steps.",
        inputSchema: {
          ids: z
            .array(z.string().uuid())
            .describe(
              "UAT step UUIDs in the desired order (first = sort_order 1). Must include ALL steps for the UAT checklist — any step omitted will be left at its current position."
            ),
        },
        outputSchema: {
          reordered: z.literal(true),
          count: z.number().describe("Number of items whose sort_order was updated"),
        },
      },
      async ({ ids }) => {
        const supabase = createAdminClient();

        // Resolve project_id from the first item so we can use the RPC
        const { data: first, error: lookupError } = await supabase
          .from("checklist_items")
          .select("project_id")
          .eq("id", ids[0])
          .single();

        if (lookupError || !first) throw new Error("Item not found");

        // Single RPC call: updates sort_order for all items in one statement,
        // then recomputes step_number (steps only, headers stay NULL).
        // This replaces the former N parallel individual UPDATEs that left
        // step_number stale after every MCP reorder.
        const { error } = await supabase.rpc("reorder_checklist_steps", {
          p_project_id: first.project_id,
          p_items: ids.map((id, index) => ({ id, sort_order: index + 1 })),
        });

        if (error) throw new Error(error.message);

        return toolResult({ reordered: true, count: ids.length });
      }
    );

    // =====================================
    // TOOL 9: get_uat_checklist_progress
    // =====================================
    server.registerTool(
      "get_uat_checklist_progress",
      {
        title: "Get UAT Checklist Progress",
        description:
          "Get testing progress for a UAT checklist — completion percentage, status breakdown, and tester count.",
        inputSchema: {
          slug: z.string().describe("The UAT checklist slug"),
        },
        outputSchema: {
          project_slug: z.string(),
          project_title: z.string().nullable(),
          total_steps: z.number().describe("Count of testable steps (phase headers excluded)"),
          total_testers: z.number(),
          total_expected_responses: z.number().describe("total_steps × total_testers — maximum possible responses"),
          total_responses: z.number().describe("Responses actually submitted so far"),
          completion_percentage: z.number().describe("Integer 0–100: (total_responses / total_expected_responses) × 100"),
          status_breakdown: z.record(z.string(), z.number()).describe("Count per status value (e.g. {Pass: 10, Fail: 2, 'N/A': 1, Blocked: 0})"),
        },
      },
      async ({ slug }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        // Phase headers can't have responses — count steps only so the
        // completion percentage doesn't get artificially diluted.
        const { data: items } = await supabase
          .from("checklist_items")
          .select("id")
          .eq("project_id", project.id)
          .eq("item_type", "step");

        const { data: testers } = await supabase
          .from("testers")
          .select("id")
          .eq("project_id", project.id);

        // Responses are linked via checklist_item_id, so filter by item IDs
        const itemIds = (items ?? []).map((i) => i.id);
        let responses: { status: string | null }[] = [];
        if (itemIds.length > 0) {
          const { data: resp } = await supabase
            .from("responses")
            .select("status")
            .in("checklist_item_id", itemIds);
          responses = resp ?? [];
        }

        const totalSteps = items?.length ?? 0;
        const totalTesters = testers?.length ?? 0;
        const totalExpected = totalSteps * totalTesters;
        const totalResponses = responses.length;

        const statusBreakdown = responses.reduce(
          (acc: Record<string, number>, r) => {
            const key = r.status ?? "No Status";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          },
          {}
        );

        return toolResult({
          project_slug: slug,
          project_title: project.title,
          total_steps: totalSteps,
          total_testers: totalTesters,
          total_expected_responses: totalExpected,
          total_responses: totalResponses,
          completion_percentage:
            totalExpected > 0
              ? Math.round((totalResponses / totalExpected) * 100)
              : 0,
          status_breakdown: statusBreakdown,
        });
      }
    );

    // ======================
    // TOOL 10: list_testers
    // ======================
    server.registerTool(
      "list_testers",
      {
        title: "List Testers",
        description: "List all registered testers for a UAT checklist.",
        inputSchema: {
          slug: z.string().describe("The UAT checklist slug"),
        },
        outputSchema: {
          project_slug: z.string(),
          total_testers: z.number(),
          testers: z.array(
            z.object({
              id: z.string().describe("Tester UUID"),
              name: z.string(),
              email: z.string(),
              mobile: z.string(),
              test_completed: z.string().nullable().describe("ISO 8601 timestamp when the tester submitted; null if not yet completed"),
              created_at: z.string().nullable().describe("ISO 8601 timestamp of tester registration"),
            })
          ),
        },
      },
      async ({ slug }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        const { data, error } = await supabase
          .from("testers")
          .select("id, name, email, mobile, test_completed, created_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);

        return toolResult({
          project_slug: slug,
          total_testers: data.length,
          testers: data,
        });
      }
    );

    // ===========================
    // TOOL 11: get_admin_reviews
    // ===========================
    server.registerTool(
      "get_admin_reviews",
      {
        title: "Get Admin Reviews",
        description:
          "Get admin review data for all non-pass UAT steps in a checklist, grouped by tester. Returns behavior type, resolution status, and findings/comments for each flagged step. Used for generating AI summaries of UAT testing results.",
        inputSchema: {
          slug: z.string().describe("The UAT checklist slug"),
        },
        outputSchema: {
          project_slug: z.string(),
          project_title: z.string().nullable(),
          total_steps: z.number().describe("Total UAT steps (steps + phase headers)"),
          total_testers: z.number(),
          summary_stats: z.object({
            total_responses: z.number(),
            pass: z.number(),
            fail: z.number(),
            na: z.number(),
            pass_rate: z.string().describe("Formatted percentage string e.g. '87.5%'"),
          }),
          admin_reviews: z.array(
            z.object({
              tester_name: z.string(),
              tester_email: z.string(),
              total_steps_assigned: z.number(),
              total_flagged: z.number().describe("Count of non-pass responses for this tester"),
              resolved_count: z.number().describe("Count of flagged items whose resolution_status is 'Done'"),
              items: z.array(
                z.object({
                  step_number: z.number().nullable(),
                  actor: z.string().nullable(),
                  action: z.string().nullable(),
                  status: z.string().nullable().describe("Response status: Fail, N/A, or Blocked"),
                  finding_type: z.string().nullable().describe("Admin-assigned finding category"),
                  resolution_status: z.string().nullable().describe("Admin resolution state (e.g. 'Done', 'In Progress')"),
                  findings: z.string().nullable().describe("Admin notes/comments for this item"),
                })
              ).describe("Non-pass items sorted by step_number ascending"),
            })
          ),
        },
      },
      async ({ slug }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        // Fetch all checklist items for this project
        const { data: allItems, error: itemsError } = await supabase
          .from("checklist_items")
          .select("id, step_number, actor, action")
          .eq("project_id", project.id)
          .order("sort_order", { ascending: true });

        if (itemsError) throw new Error(itemsError.message);

        // Fetch all testers for this project
        const { data: allTesters, error: testersError } = await supabase
          .from("testers")
          .select("id, name, email")
          .eq("project_id", project.id)
          .order("created_at", { ascending: true });

        if (testersError) throw new Error(testersError.message);

        const itemIds = (allItems ?? []).map((i) => i.id);

        // Fetch ALL responses (needed for summary stats)
        let allResponses: {
          tester_id: string;
          checklist_item_id: string;
          status: string | null;
        }[] = [];
        if (itemIds.length > 0) {
          const { data: resp, error: respError } = await supabase
            .from("responses")
            .select("tester_id, checklist_item_id, status")
            .in("checklist_item_id", itemIds);
          if (respError) throw new Error(respError.message);
          allResponses = resp ?? [];
        }

        // Fetch all admin reviews for this project's items
        let allReviews: {
          checklist_item_id: string;
          tester_id: string;
          finding_type: string | null;
          resolution_status: string;
          notes: string | null;
        }[] = [];
        if (itemIds.length > 0) {
          const { data: rev, error: revError } = await supabase
            .from("admin_reviews")
            .select(
              "checklist_item_id, tester_id, finding_type, resolution_status, notes"
            )
            .in("checklist_item_id", itemIds);
          if (revError) throw new Error(revError.message);
          allReviews = rev ?? [];
        }

        // Build lookup maps for O(1) access
        const itemMap = new Map((allItems ?? []).map((i) => [i.id, i]));
        const reviewMap = new Map(
          allReviews.map((r) => [`${r.checklist_item_id}:${r.tester_id}`, r])
        );

        // Compute summary stats across all responses
        const totalResponses = allResponses.length;
        const passCount = allResponses.filter((r) => r.status === "Pass").length;
        const failCount = allResponses.filter((r) => r.status === "Fail").length;
        const naCount = allResponses.filter((r) => r.status === "N/A").length;
        const passRate =
          totalResponses > 0
            ? `${((passCount / totalResponses) * 100).toFixed(1)}%`
            : "0%";

        // Build per-tester review data
        const adminReviews = (allTesters ?? []).map((tester) => {
          const testerResponses = allResponses.filter(
            (r) => r.tester_id === tester.id
          );
          // Only include non-pass responses (Fail, N/A, Blocked)
          const nonPassResponses = testerResponses.filter(
            (r) => r.status !== "Pass" && r.status !== null
          );

          const items = nonPassResponses
            .map((resp) => {
              const item = itemMap.get(resp.checklist_item_id);
              const review = reviewMap.get(
                `${resp.checklist_item_id}:${tester.id}`
              );
              return {
                step_number: item?.step_number ?? null,
                actor: item?.actor ?? null,
                action: item?.action ?? null,
                status: resp.status,
                finding_type: review?.finding_type ?? null,
                resolution_status: review?.resolution_status ?? null,
                findings: review?.notes ?? null,
              };
            })
            .sort((a, b) => (a.step_number ?? 0) - (b.step_number ?? 0));

          const resolvedCount = items.filter(
            (i) => i.resolution_status === "Done"
          ).length;

          return {
            tester_name: tester.name,
            tester_email: tester.email,
            total_steps_assigned: allItems?.length ?? 0,
            total_flagged: items.length,
            resolved_count: resolvedCount,
            items,
          };
        });

        return toolResult({
          project_slug: slug,
          project_title: project.title,
          total_steps: allItems?.length ?? 0,
          total_testers: allTesters?.length ?? 0,
          summary_stats: {
            total_responses: totalResponses,
            pass: passCount,
            fail: failCount,
            na: naCount,
            pass_rate: passRate,
          },
          admin_reviews: adminReviews,
        });
      }
    );

    // ==========================================================
    // TEMP SPIKE TOOL: debug_image_probe — remove after testing.
    // Answers one question: does claude.ai actually forward a
    // pasted image's real bytes into a tool call as base64 text,
    // or does the model just describe/hallucinate the data?
    // No DB access — pure inspection, safe to leave live briefly.
    // ==========================================================
    server.registerTool(
      "debug_image_probe",
      {
        title: "[SPIKE] Debug Image Probe",
        description:
          "TEMPORARY diagnostic tool. Call this with the base64-encoded content of an image the user just pasted into this chat, so we can verify whether real image bytes make it through. Pass the full base64 string (no data: URL prefix) as image_data.",
        inputSchema: {
          image_data: z
            .string()
            .describe(
              "The image's raw bytes, base64-encoded (strip any 'data:image/png;base64,' prefix first). Send the full string, not a truncated sample."
            ),
          filename: z
            .string()
            .optional()
            .describe("Original filename, if known"),
        },
        outputSchema: {
          received_string_length: z.number().describe("Length of the base64 text as received"),
          decoded_byte_length: z.number().describe("Length in bytes after base64-decoding"),
          detected_format: z
            .string()
            .describe("Image format detected from magic bytes, or 'unknown/invalid' if the decoded bytes don't match a known image header"),
          first_16_bytes_hex: z.string().describe("First 16 bytes of decoded data as hex, for manual inspection"),
        },
      },
      async ({ image_data, filename }) => {
        const cleaned = image_data.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(cleaned, "base64");

        let detectedFormat = "unknown/invalid";
        if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
          detectedFormat = "png";
        } else if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
          detectedFormat = "jpeg";
        } else if (buf.length >= 6 && buf.toString("ascii", 0, 3) === "GIF") {
          detectedFormat = "gif";
        } else if (
          buf.length >= 12 &&
          buf.toString("ascii", 0, 4) === "RIFF" &&
          buf.toString("ascii", 8, 12) === "WEBP"
        ) {
          detectedFormat = "webp";
        }

        return toolResult({
          filename: filename ?? null,
          received_string_length: image_data.length,
          decoded_byte_length: buf.length,
          detected_format: detectedFormat,
          first_16_bytes_hex: buf.subarray(0, 16).toString("hex"),
        });
      }
    );
  },
  {
    capabilities: {},
  },
  {
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
  }
);

// --- Auth Middleware Wrapper ---
// Accepts either a static API key (header or query param — used by Claude
// Code / direct integrations) or an OAuth Bearer access token issued by the
// /oauth/authorize + /api/oauth/token flow (used by claude.ai custom
// connectors, which require OAuth and ignore a query-param key).
async function withApiKeyAuth(
  req: Request,
  handlerFn: (req: Request) => Promise<Response>
): Promise<Response> {
  const url = new URL(req.url);
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (bearerToken) {
    const { validateAccessToken } = await import("@/lib/oauth/store");
    const expectedResource = `${url.origin}/api/mcp`;
    const valid = await validateAccessToken(bearerToken, expectedResource);
    if (valid) return handlerFn(req);
    return unauthorized(req);
  }

  const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
  const expectedKey = process.env.MCP_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return unauthorized(req);
  }

  return handlerFn(req);
}

function unauthorized(req: Request): Response {
  const origin = new URL(req.url).origin;
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/api/mcp"`,
    },
  });
}

// Export route handlers with auth wrapper
export async function GET(req: Request) {
  return withApiKeyAuth(req, handler);
}

export async function POST(req: Request) {
  return withApiKeyAuth(req, handler);
}

export async function DELETE(req: Request) {
  return withApiKeyAuth(req, handler);
}
