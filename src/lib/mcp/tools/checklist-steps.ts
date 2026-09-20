import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppBaseUrl, getProjectBySlug, toolResult } from "@/lib/mcp/helpers";
import { buildAbsoluteSampleProxyUrl } from "@/lib/utils/sample-url";

// Mirrors the admin sample-upload route's allow-list (src/app/api/admin/sample-upload-url/route.ts)
// so MCP-attached samples land in the same bucket/path shape and render the same way.
const SAMPLE_MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

const MAX_SAMPLE_BYTES = 10 * 1024 * 1024;

function getSafeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function decodeBase64Image(imageBase64: string): Buffer {
  const stripped = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  return Buffer.from(stripped, "base64");
}

export function registerChecklistStepTools(server: McpServer) {
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

  // ==============================
  // TOOL 6b: attach_step_sample
  // ==============================
  server.registerTool(
    "attach_step_sample",
    {
      title: "Attach Step Sample Image",
      description:
        "Upload a screenshot/sample image (base64-encoded, e.g. one pasted into the chat) and attach it to a UAT step's view_sample field, so testers see it as the expected result. Only testable steps can have a sample — not section headers.",
      inputSchema: {
        id: z.string().uuid().describe("The UAT step UUID to attach the sample image to"),
        image_base64: z
          .string()
          .describe(
            "Base64-encoded image data. A 'data:image/...;base64,' prefix is accepted and stripped automatically."
          ),
        mime_type: z
          .enum(["image/png", "image/jpeg", "image/gif", "image/webp"])
          .describe("Image MIME type"),
        file_name: z
          .string()
          .optional()
          .describe("Original file name, used to name the stored object. Defaults to 'sample.<ext>'."),
      },
    },
    async ({ id, image_base64, mime_type, file_name }) => {
      const supabase = createAdminClient();

      const { data: item, error: itemError } = await supabase
        .from("checklist_items")
        .select("id, project_id, item_type, step_number")
        .eq("id", id)
        .single();

      if (itemError || !item) throw new Error(`UAT step not found: ${id}`);
      if (item.item_type === "phase_header") {
        throw new Error("Samples can only be attached to testable steps, not section headers");
      }

      const buffer = decodeBase64Image(image_base64);
      if (buffer.length === 0) {
        throw new Error("Decoded image is empty — check image_base64");
      }
      if (buffer.length > MAX_SAMPLE_BYTES) {
        throw new Error(`Image is ${buffer.length} bytes, over the ${MAX_SAMPLE_BYTES}-byte limit`);
      }

      const extension = SAMPLE_MIME_EXTENSIONS[mime_type];
      const safeFileName = getSafeFileName(file_name ?? `sample.${extension}`);
      const uniqueId = crypto.randomUUID();
      const path = `samples/${item.project_id}/${id}/${uniqueId}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .upload(path, buffer, { contentType: mime_type, upsert: false });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const viewSampleUrl = buildAbsoluteSampleProxyUrl(getAppBaseUrl(), path);

      const { data: updated, error: updateError } = await supabase
        .from("checklist_items")
        .update({ view_sample: viewSampleUrl })
        .eq("id", id)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message);

      return toolResult({
        attached: true,
        step_id: id,
        step_number: item.step_number,
        view_sample: viewSampleUrl,
        item: updated,
      });
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
}
