import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// --- Helpers ---

async function getProjectBySlug(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) throw new Error(`Project not found: ${slug}`);
  return data;
}

function textResult(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

// --- MCP Handler ---

const handler = createMcpHandler(
  (server) => {
    // =====================
    // TOOL 1: list_projects
    // =====================
    server.registerTool(
      "list_projects",
      {
        title: "List Projects",
        description:
          "List all UAT projects. Optionally filter by company name (exact match).",
        inputSchema: {
          company_name: z
            .string()
            .optional()
            .describe("Filter by company name (exact match)"),
        },
      },
      async ({ company_name }) => {
        const supabase = createAdminClient();
        let query = supabase
          .from("projects")
          .select(
            "id, slug, company_name, title, test_scenario, talkpush_login_link, created_at"
          )
          .order("created_at", { ascending: false });

        if (company_name) query = query.eq("company_name", company_name);

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return textResult({ count: data.length, projects: data });
      }
    );

    // ========================
    // TOOL 2: create_project
    // ========================
    server.registerTool(
      "create_project",
      {
        title: "Create Project",
        description:
          "Create a new UAT project. Slug must be lowercase alphanumeric with hyphens.",
        inputSchema: {
          company_name: z
            .string()
            .min(1)
            .max(200)
            .describe("The client/company name (e.g., 'Accenture')"),
          title: z
            .string()
            .min(1)
            .max(300)
            .describe("The project title (e.g., 'ERP Link Generator UAT')"),
          slug: z
            .string()
            .min(1)
            .max(100)
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
            .describe(
              "URL-friendly identifier, lowercase alphanumeric with hyphens (e.g., 'acme-erp-uat')"
            ),
          test_scenario: z
            .string()
            .max(2000)
            .optional()
            .describe("Description of what is being tested (optional)"),
          talkpush_login_link: z
            .string()
            .url()
            .max(500)
            .optional()
            .describe("Talkpush login URL (optional)"),
        },
      },
      async ({ company_name, title, slug, test_scenario, talkpush_login_link }) => {
        const supabase = createAdminClient();

        const { data, error } = await supabase
          .from("projects")
          .insert({
            company_name,
            title,
            slug,
            test_scenario: test_scenario ?? null,
            talkpush_login_link: talkpush_login_link ?? null,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            throw new Error("A project with this slug already exists");
          }
          throw new Error(error.message);
        }

        return textResult({ created: true, project: data });
      }
    );

    // =====================
    // TOOL 3: get_project
    // =====================
    server.registerTool(
      "get_project",
      {
        title: "Get Project Details",
        description:
          "Get full details of a UAT project by slug, including checklist items and testers.",
        inputSchema: {
          slug: z.string().min(1).describe("The project slug (URL identifier)"),
        },
      },
      async ({ slug }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        const { data: items } = await supabase
          .from("checklist_items")
          .select("*")
          .eq("project_id", project.id)
          .order("sort_order", { ascending: true });

        const { data: testers } = await supabase
          .from("testers")
          .select("*")
          .eq("project_id", project.id)
          .order("created_at", { ascending: true });

        return textResult({
          project,
          checklist_items: items ?? [],
          testers: testers ?? [],
        });
      }
    );

    // =====================
    // TOOL 4: get_checklist
    // =====================
    server.registerTool(
      "get_checklist",
      {
        title: "Get Checklist",
        description:
          "Get all checklist steps for a project, ordered by sort_order.",
        inputSchema: {
          project_slug: z.string().min(1).describe("The project slug"),
        },
      },
      async ({ project_slug }) => {
        const project = await getProjectBySlug(project_slug);
        const supabase = createAdminClient();

        const { data, error } = await supabase
          .from("checklist_items")
          .select("*")
          .eq("project_id", project.id)
          .order("sort_order", { ascending: true });

        if (error) throw new Error(error.message);

        return textResult({
          project_slug,
          project_title: project.title,
          total_steps: data.length,
          items: data,
        });
      }
    );

    // ==============================
    // TOOL 5: create_checklist_items
    // ==============================
    server.registerTool(
      "create_checklist_items",
      {
        title: "Create Checklist Items",
        description:
          "Add new checklist steps to a project. Step numbers are auto-renumbered after insertion.",
        inputSchema: {
          project_id: z.string().uuid().describe("The project UUID"),
          items: z
            .array(
              z.object({
                actor: z
                  .enum([
                    "Candidate",
                    "Talkpush",
                    "Recruiter",
                    "Referrer/Vendor",
                  ])
                  .describe("Who performs this step"),
                action: z
                  .string()
                  .min(1)
                  .max(2000)
                  .describe("What the actor does in this step"),
                path: z
                  .enum(["Happy", "Non-Happy"])
                  .nullable()
                  .optional()
                  .describe("Test path type: 'Happy' or 'Non-Happy' (optional)"),
                crm_module: z
                  .string()
                  .max(200)
                  .optional()
                  .describe("CRM module name (optional)"),
                tip: z
                  .string()
                  .max(500)
                  .optional()
                  .describe("Tip or hint for the tester (optional)"),
                view_sample: z
                  .string()
                  .max(2000)
                  .optional()
                  .describe("Sample view or reference (optional)"),
              })
            )
            .min(1)
            .describe("Array of checklist items to create"),
        },
      },
      async ({ project_id, items }) => {
        const supabase = createAdminClient();

        // Verify project exists
        const { data: project, error: projErr } = await supabase
          .from("projects")
          .select("id")
          .eq("id", project_id)
          .single();

        if (projErr || !project) throw new Error("Project not found");

        // Get current max sort_order
        const { data: existing } = await supabase
          .from("checklist_items")
          .select("sort_order")
          .eq("project_id", project_id)
          .order("sort_order", { ascending: false })
          .limit(1);

        let nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

        const rows = items.map((item) => ({
          project_id,
          step_number: nextOrder,
          sort_order: nextOrder++,
          actor: item.actor,
          action: item.action,
          path: item.path ?? null,
          crm_module: item.crm_module ?? null,
          tip: item.tip ?? null,
          view_sample: item.view_sample ?? null,
        }));

        const { data, error } = await supabase
          .from("checklist_items")
          .insert(rows)
          .select();

        if (error) throw new Error(error.message);

        // Renumber steps to ensure sequential step_numbers
        await supabase.rpc("renumber_steps", { p_project_id: project_id });

        return textResult({
          created: data.length,
          project_id,
          items: data,
        });
      }
    );

    // ==============================
    // TOOL 6: update_checklist_item
    // ==============================
    server.registerTool(
      "update_checklist_item",
      {
        title: "Update Checklist Item",
        description: "Edit a specific checklist item by its ID.",
        inputSchema: {
          id: z.string().uuid().describe("The checklist item UUID"),
          actor: z
            .enum(["Candidate", "Talkpush", "Recruiter", "Referrer/Vendor"])
            .optional()
            .describe("Updated actor"),
          action: z
            .string()
            .min(1)
            .max(2000)
            .optional()
            .describe("Updated action text"),
          path: z
            .enum(["Happy", "Non-Happy"])
            .nullable()
            .optional()
            .describe("Updated path type"),
          step_number: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Updated step number"),
          crm_module: z
            .string()
            .max(200)
            .nullable()
            .optional()
            .describe("Updated CRM module"),
          tip: z
            .string()
            .max(500)
            .nullable()
            .optional()
            .describe("Updated tip"),
          view_sample: z
            .string()
            .max(2000)
            .nullable()
            .optional()
            .describe("Updated sample view"),
        },
      },
      async ({ id, ...updates }) => {
        const supabase = createAdminClient();

        // Build update object from provided fields only
        const cleanUpdates: Record<string, unknown> = {};
        if (updates.actor !== undefined) cleanUpdates.actor = updates.actor;
        if (updates.action !== undefined) cleanUpdates.action = updates.action;
        if (updates.path !== undefined) cleanUpdates.path = updates.path;
        if (updates.step_number !== undefined) cleanUpdates.step_number = updates.step_number;
        if (updates.crm_module !== undefined) cleanUpdates.crm_module = updates.crm_module;
        if (updates.tip !== undefined) cleanUpdates.tip = updates.tip;
        if (updates.view_sample !== undefined) cleanUpdates.view_sample = updates.view_sample;

        const { data, error } = await supabase
          .from("checklist_items")
          .update(cleanUpdates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        // Renumber if step_number changed
        if (updates.step_number !== undefined && data) {
          await supabase.rpc("renumber_steps", { p_project_id: data.project_id });
        }

        return textResult({ updated: true, item: data });
      }
    );

    // ================================
    // TOOL 7: delete_checklist_items
    // ================================
    server.registerTool(
      "delete_checklist_items",
      {
        title: "Delete Checklist Items",
        description:
          "Delete one or more checklist items by ID. Step numbers are automatically renumbered.",
        inputSchema: {
          ids: z
            .array(z.string().uuid())
            .min(1)
            .describe("Array of checklist item UUIDs to delete"),
        },
      },
      async ({ ids }) => {
        const supabase = createAdminClient();

        // Look up project_id from first item for renumbering
        const { data: first } = await supabase
          .from("checklist_items")
          .select("project_id")
          .eq("id", ids[0])
          .single();

        if (!first) throw new Error("Checklist items not found");

        const { error } = await supabase
          .from("checklist_items")
          .delete()
          .in("id", ids);

        if (error) throw new Error(error.message);

        // Renumber remaining steps
        await supabase.rpc("renumber_steps", {
          p_project_id: first.project_id,
        });

        return textResult({ deleted: ids.length, ids });
      }
    );

    // ============================
    // TOOL 8: reorder_checklist
    // ============================
    server.registerTool(
      "reorder_checklist",
      {
        title: "Reorder Checklist",
        description:
          "Reorder checklist items by providing new sort_order values. Step numbers are automatically recalculated.",
        inputSchema: {
          project_id: z.string().uuid().describe("The project UUID"),
          items: z
            .array(
              z.object({
                id: z.string().uuid().describe("Checklist item UUID"),
                sort_order: z
                  .number()
                  .int()
                  .min(0)
                  .describe("New sort order value"),
              })
            )
            .min(1)
            .describe(
              "Array of {id, sort_order} pairs specifying the new order"
            ),
        },
      },
      async ({ project_id, items }) => {
        const supabase = createAdminClient();

        const { error } = await supabase.rpc("reorder_checklist_steps", {
          p_project_id: project_id,
          p_items: items.map((item) => ({
            id: item.id,
            sort_order: item.sort_order,
          })),
        });

        if (error) throw new Error(error.message);

        return textResult({ reordered: true, count: items.length });
      }
    );

    // ===============================
    // TOOL 9: get_project_progress
    // ===============================
    server.registerTool(
      "get_project_progress",
      {
        title: "Get Project Progress",
        description:
          "Get testing progress for a project — per-tester pass/fail/N-A/blocked counts and overall completion.",
        inputSchema: {
          project_slug: z.string().min(1).describe("The project slug"),
        },
      },
      async ({ project_slug }) => {
        const project = await getProjectBySlug(project_slug);
        const supabase = createAdminClient();

        // Get checklist item IDs for this project
        const { data: items } = await supabase
          .from("checklist_items")
          .select("id")
          .eq("project_id", project.id);

        const itemIds = (items ?? []).map((i) => i.id);

        // Get testers for this project
        const { data: testers } = await supabase
          .from("testers")
          .select("id, name, email, mobile")
          .eq("project_id", project.id)
          .order("created_at", { ascending: true });

        const totalSteps = itemIds.length;
        const totalTesters = testers?.length ?? 0;

        if (totalTesters === 0 || totalSteps === 0) {
          return textResult({
            project_slug,
            total_steps: totalSteps,
            total_testers: totalTesters,
            total_expected_responses: 0,
            total_responses: 0,
            completion_percentage: 0,
            status_breakdown: {},
            testers: (testers ?? []).map((t) => ({
              ...t,
              pass: 0,
              fail: 0,
              na: 0,
              blocked: 0,
              total: 0,
            })),
          });
        }

        // Fetch responses filtered by both tester IDs and checklist item IDs
        const testerIds = testers!.map((t) => t.id);
        const { data: responses } = await supabase
          .from("responses")
          .select("tester_id, status")
          .in("tester_id", testerIds)
          .in("checklist_item_id", itemIds);

        const allResponses = responses ?? [];
        const totalExpected = totalSteps * totalTesters;
        const totalResponses = allResponses.filter((r) => r.status !== null).length;

        const statusBreakdown = allResponses.reduce(
          (acc: Record<string, number>, r) => {
            if (r.status) acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          },
          {}
        );

        const testerProgress = testers!.map((tester) => {
          const testerResponses = allResponses.filter(
            (r) => r.tester_id === tester.id && r.status !== null
          );
          return {
            ...tester,
            total: testerResponses.length,
            pass: testerResponses.filter((r) => r.status === "Pass").length,
            fail: testerResponses.filter((r) => r.status === "Fail").length,
            na: testerResponses.filter((r) => r.status === "N/A").length,
            blocked: testerResponses.filter((r) => r.status === "Blocked").length,
          };
        });

        return textResult({
          project_slug,
          total_steps: totalSteps,
          total_testers: totalTesters,
          total_expected_responses: totalExpected,
          total_responses: totalResponses,
          completion_percentage:
            totalExpected > 0
              ? Math.round((totalResponses / totalExpected) * 100)
              : 0,
          status_breakdown: statusBreakdown,
          testers: testerProgress,
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
        description: "List all registered testers for a project.",
        inputSchema: {
          project_slug: z.string().min(1).describe("The project slug"),
        },
      },
      async ({ project_slug }) => {
        const project = await getProjectBySlug(project_slug);
        const supabase = createAdminClient();

        const { data, error } = await supabase
          .from("testers")
          .select("id, name, email, mobile, test_completed, created_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: true });

        if (error) throw new Error(error.message);

        return textResult({
          project_slug,
          total_testers: data.length,
          testers: data,
        });
      }
    );
  },
  {
    serverInfo: {
      name: "uat-mcp-server",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === "development",
  }
);

// --- API Key Auth Wrapper ---

function withApiKeyAuth(
  handlerFn: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = process.env.MCP_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return handlerFn(req);
  };
}

const authedHandler = withApiKeyAuth(handler);

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
