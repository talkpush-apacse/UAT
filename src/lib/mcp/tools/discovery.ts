import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectBySlug, getAppBaseUrl, toolResult } from "@/lib/mcp/helpers";

export function registerDiscoveryTools(server: McpServer) {
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
      const baseUrl = getAppBaseUrl();

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
      const baseUrl = getAppBaseUrl();

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
}
