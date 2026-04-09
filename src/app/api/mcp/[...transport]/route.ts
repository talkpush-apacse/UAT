import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

// --- Helper ---
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
          "List all UAT projects. Optionally filter by company name.",
        inputSchema: {
          company: z
            .string()
            .optional()
            .describe("Filter by company name (partial match)"),
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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { count: data.length, projects: data },
                null,
                2
              ),
            },
          ],
        };
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
          "Create a new UAT project. Generates a URL-friendly slug from the title automatically.",
        inputSchema: {
          company_name: z
            .string()
            .describe("The client/company name (e.g., 'Accenture')"),
          title: z
            .string()
            .describe("The project title (e.g., 'ERP Link Generator UAT')"),
          test_scenario: z
            .string()
            .optional()
            .describe("Description of what is being tested (optional)"),
          talkpush_login_link: z
            .string()
            .optional()
            .describe("Talkpush login link for the project (optional)"),
        },
      },
      async ({ company_name, title, test_scenario, talkpush_login_link }) => {
        const supabase = createAdminClient();

        // Generate slug from title
        const baseSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        // Check for slug collision and append suffix if needed
        const { data: existing } = await supabase
          .from("projects")
          .select("slug")
          .ilike("slug", `${baseSlug}%`);

        const slug =
          existing && existing.length > 0
            ? `${baseSlug}-${existing.length + 1}`
            : baseSlug;

        const { data, error } = await supabase
          .from("projects")
          .insert({
            company_name,
            title,
            test_scenario: test_scenario ?? null,
            talkpush_login_link: talkpush_login_link ?? null,
            slug,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ created: true, project: data }, null, 2),
            },
          ],
        };
      }
    );

    // =====================
    // TOOL 3: get_project
    // =====================
    server.registerTool(
      "get_project",
      {
        title: "Get Project Details",
        description: "Get full details of a UAT project by its slug.",
        inputSchema: {
          slug: z.string().describe("The project slug (URL identifier)"),
        },
      },
      async ({ slug }) => {
        const project = await getProjectBySlug(slug);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(project, null, 2) },
          ],
        };
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
          slug: z.string().describe("The project slug"),
        },
      },
      async ({ slug }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        const { data, error } = await supabase
          .from("checklist_items")
          .select("id, actor, action, path, crm_module, tip, view_sample, sort_order, step_number")
          .eq("project_id", project.id)
          .order("sort_order", { ascending: true });

        if (error) throw new Error(error.message);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  project_slug: slug,
                  project_title: project.title,
                  total_steps: data.length,
                  items: data,
                },
                null,
                2
              ),
            },
          ],
        };
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
          "Add new checklist steps to a project. Auto-increments sort_order and step_number after existing items.",
        inputSchema: {
          slug: z.string().describe("The project slug"),
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
                  .describe("What the actor does in this step"),
                path: z
                  .string()
                  .optional()
                  .describe("URL path or location in the app (optional)"),
                crm_module: z
                  .string()
                  .optional()
                  .describe("CRM module name (optional)"),
                tip: z
                  .string()
                  .optional()
                  .describe("Helpful tip for the tester (optional)"),
                view_sample: z
                  .string()
                  .optional()
                  .describe("URL to a sample/screenshot (optional)"),
              })
            )
            .describe("Array of checklist items to create"),
        },
      },
      async ({ slug, items }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        // Get current max sort_order and step_number
        const { data: existing } = await supabase
          .from("checklist_items")
          .select("sort_order, step_number")
          .eq("project_id", project.id)
          .order("sort_order", { ascending: false })
          .limit(1);

        let nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
        let nextStep = (existing?.[0]?.step_number ?? 0) + 1;

        const rows = items.map((item) => ({
          project_id: project.id,
          actor: item.actor,
          action: item.action,
          path: item.path ?? null,
          crm_module: item.crm_module ?? null,
          tip: item.tip ?? null,
          view_sample: item.view_sample ?? null,
          sort_order: nextOrder++,
          step_number: nextStep++,
        }));

        const { data, error } = await supabase
          .from("checklist_items")
          .insert(rows)
          .select();

        if (error) throw new Error(error.message);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  created: data.length,
                  project_slug: slug,
                  items: data,
                },
                null,
                2
              ),
            },
          ],
        };
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
          action: z.string().optional().describe("Updated action text"),
          path: z.string().optional().describe("Updated path"),
          crm_module: z.string().optional().describe("Updated CRM module"),
          tip: z.string().optional().describe("Updated tip"),
          view_sample: z.string().optional().describe("Updated sample URL"),
        },
      },
      async ({ id, ...updates }) => {
        const supabase = createAdminClient();
        // Remove undefined values
        const cleanUpdates = Object.fromEntries(
          Object.entries(updates).filter(([, v]) => v !== undefined)
        );

        if (Object.keys(cleanUpdates).length === 0) {
          throw new Error("No fields provided to update");
        }

        const { data, error } = await supabase
          .from("checklist_items")
          .update(cleanUpdates)
          .eq("id", id)
          .select()
          .single();

        if (error) throw new Error(error.message);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ updated: true, item: data }, null, 2),
            },
          ],
        };
      }
    );

    // ================================
    // TOOL 7: delete_checklist_items
    // ================================
    server.registerTool(
      "delete_checklist_items",
      {
        title: "Delete Checklist Items",
        description: "Delete one or more checklist items by their IDs.",
        inputSchema: {
          ids: z
            .array(z.string().uuid())
            .describe("Array of checklist item UUIDs to delete"),
        },
      },
      async ({ ids }) => {
        const supabase = createAdminClient();
        const { error } = await supabase
          .from("checklist_items")
          .delete()
          .in("id", ids);

        if (error) throw new Error(error.message);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ deleted: ids.length, ids }),
            },
          ],
        };
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
          "Reorder checklist items by providing an array of IDs in the desired order. Updates sort_order values accordingly.",
        inputSchema: {
          ids: z
            .array(z.string().uuid())
            .describe(
              "Checklist item UUIDs in the desired order (first = sort_order 1)"
            ),
        },
      },
      async ({ ids }) => {
        const supabase = createAdminClient();
        const updates = ids.map((id, index) =>
          supabase
            .from("checklist_items")
            .update({ sort_order: index + 1 })
            .eq("id", id)
        );

        await Promise.all(updates);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ reordered: true, count: ids.length }),
            },
          ],
        };
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
          "Get testing progress for a project — completion percentage, status breakdown, and tester count.",
        inputSchema: {
          slug: z.string().describe("The project slug"),
        },
      },
      async ({ slug }) => {
        const supabase = createAdminClient();
        const project = await getProjectBySlug(slug);

        const { data: items } = await supabase
          .from("checklist_items")
          .select("id")
          .eq("project_id", project.id);

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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
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
          slug: z.string().describe("The project slug"),
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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  project_slug: slug,
                  total_testers: data.length,
                  testers: data,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    );
  },
  {
    capabilities: {},
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: true,
  }
);

// --- API Key Middleware Wrapper ---
async function withApiKeyAuth(
  req: Request,
  handlerFn: (req: Request) => Promise<Response>
): Promise<Response> {
  const apiKey = req.headers.get("x-api-key");
  const expectedKey = process.env.MCP_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return handlerFn(req);
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
