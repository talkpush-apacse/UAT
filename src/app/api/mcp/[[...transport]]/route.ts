import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateUniqueProjectSlug } from "@/lib/utils/project-slug";

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
    // ============================================================
    // TOOL: search (required by ChatGPT MCP Apps spec)
    // Returns matching projects as {id, title, url} results.
    // ChatGPT and Claude.ai both support this; domain-specific tools
    // below (list_projects, get_project, etc.) still work as before.
    // ============================================================
    server.registerTool(
      "search",
      {
        title: "Search Projects",
        description:
          "Search UAT projects by query string. Matches against project title and company name. Returns up to 20 results with id, title, and public URL. Use this for quick lookups; use get_project for full detail.",
        inputSchema: {
          query: z
            .string()
            .describe(
              "Search query — matches project title or company name (case-insensitive, partial match)"
            ),
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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ results }, null, 2),
            },
          ],
        };
      }
    );

    // ============================================================
    // TOOL: fetch (required by ChatGPT MCP Apps spec)
    // Takes an id (project slug) and returns full project detail
    // including its checklist steps as a structured text document.
    // ============================================================
    server.registerTool(
      "fetch",
      {
        title: "Fetch Project Document",
        description:
          "Fetch full details of a UAT project by id (the project slug). Returns project metadata, test scenario, and all checklist steps as a single document. Use this after search to retrieve full content.",
        inputSchema: {
          id: z
            .string()
            .describe(
              "The project id (slug) returned from the search tool"
            ),
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
        lines.push(`## Checklist (${items?.length ?? 0} steps)`);
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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(document, null, 2),
            },
          ],
        };
      }
    );

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
          country: z
            .string()
            .regex(/^[A-Za-z]{2}$/)
            .optional()
            .describe("ISO 3166-1 alpha-2 country code for the tester phone input default (e.g. 'PH', 'IN', 'US'). Defaults to 'PH'."),
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
          .select(
            "id, actor, action, path, crm_module, tip, view_sample, sort_order, step_number, item_type, header_label"
          )
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
          "Add new checklist steps or phase headers to a project. Auto-increments sort_order; step_number is sequential for testable steps and NULL for phase headers.",
        inputSchema: {
          slug: z.string().describe("The project slug"),
          items: z
            .array(
              z.object({
                item_type: z
                  .enum(["step", "phase_header"])
                  .default("step")
                  .describe(
                    "'step' (default) creates a testable step; 'phase_header' creates a non-testable section divider"
                  ),
                actor: z
                  .enum([
                    "Candidate",
                    "Talkpush",
                    "Recruiter",
                    "Referrer/Vendor",
                  ])
                  .optional()
                  .describe("Who performs this step (required for 'step', ignored for 'phase_header')"),
                action: z
                  .string()
                  .describe(
                    "For a step: what the actor does. For a phase header: the title and description text."
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
                    "Short uppercase label for a phase header (e.g. 'PHASE 1'). Ignored for steps."
                  ),
              })
            )
            .describe("Array of checklist items to create"),
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
          item_type: z
            .enum(["step", "phase_header"])
            .optional()
            .describe(
              "Convert between testable step and phase header. When switching to phase_header, step_number is cleared."
            ),
          header_label: z
            .string()
            .optional()
            .describe(
              "Short uppercase label for a phase header (e.g. 'PHASE 1')."
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

    // ===========================
    // TOOL 11: get_admin_reviews
    // ===========================
    server.registerTool(
      "get_admin_reviews",
      {
        title: "Get Admin Reviews",
        description:
          "Get admin review data for all non-pass checklist items in a project, grouped by tester. Returns behavior type, resolution status, and findings/comments for each flagged item. Used for generating AI summaries of UAT testing results.",
        inputSchema: {
          slug: z.string().describe("The project slug"),
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

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
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
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
  }
);

// --- API Key Middleware Wrapper ---
async function withApiKeyAuth(
  req: Request,
  handlerFn: (req: Request) => Promise<Response>
): Promise<Response> {
  const url = new URL(req.url);
  const apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
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
