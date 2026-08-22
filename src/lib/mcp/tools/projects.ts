import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateUniqueProjectSlug } from "@/lib/utils/project-slug";
import { generateShareToken } from "@/lib/utils/share-token";
import { getProjectBySlug, getAppBaseUrl, toolResult } from "@/lib/mcp/helpers";

// Resolves company_name to a real client row, reusing an existing client
// (case-insensitive exact match) so geo/typo variants of the same company
// (e.g. "taskus" vs "TaskUs") don't spawn duplicate client records. Creates
// a new client automatically when the company genuinely isn't tracked yet,
// so a checklist is never left unlinked.
async function resolveOrCreateClient(
  supabase: ReturnType<typeof createAdminClient>,
  companyName: string
): Promise<string> {
  const trimmedName = companyName.trim();

  const { data: existingClient, error: lookupError } = await supabase
    .from("clients")
    .select("id")
    .ilike("name", trimmedName)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (existingClient) return existingClient.id;

  const { data: newClient, error: insertError } = await supabase
    .from("clients")
    .insert({ name: trimmedName })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  return newClient.id;
}

export function registerProjectTools(server: McpServer) {
  // ===========================
  // TOOL 0: list_clients
  // ===========================
  server.registerTool(
    "list_clients",
    {
      title: "List Clients",
      description:
        "List all existing client/company records. Call this BEFORE create_uat_checklist or update_uat_checklist to check whether the company already exists — reuse its exact name instead of typing a new variant (e.g. 'TaskUs Philippines' when 'TaskUs PH' is already tracked), which would otherwise create a disconnected duplicate client.",
      inputSchema: {},
    },
    async () => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, logo_url")
        .order("name");

      if (error) throw new Error(error.message);

      return toolResult({ count: data.length, clients: data });
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

      const projects = data.map((p) => ({
        ...p,
        test_url: `${getAppBaseUrl()}/test/${p.slug}`,
      }));

      return toolResult({ count: projects.length, projects });
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
        "Create a new UAT checklist. Generates a URL-friendly slug from the title automatically. Call list_clients first and reuse an existing client's exact name whenever the company is already tracked — even if the request describes a specific office or geo (e.g. use 'TaskUs' rather than inventing 'TaskUs Philippines' if 'TaskUs' is already the tracked client for that org). A name that doesn't match any existing client is automatically created as a new client record and linked to this checklist.",
      inputSchema: {
        company_name: z
          .string()
          .describe(
            "The client/company name (e.g., 'Accenture'). Check list_clients first and reuse the exact existing name whenever this company is already tracked — a new name automatically creates a new client record."
          ),
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
    },
    async ({ company_name, title, test_scenario, talkpush_login_link, country }) => {
      const supabase = createAdminClient();
      const slug = await generateUniqueProjectSlug(supabase, title);

      const clientId = await resolveOrCreateClient(supabase, company_name);

      const { data, error } = await supabase
        .from("projects")
        .insert({
          company_name,
          client_id: clientId,
          title,
          test_scenario: test_scenario ?? null,
          talkpush_login_link: talkpush_login_link ?? null,
          country: country ? country.toUpperCase() : "PH",
          slug,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return toolResult({
        created: true,
        project: data,
        test_url: `${getAppBaseUrl()}/test/${data.slug}`,
      });
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
          .describe(
            "Replacement client/company name (1–200 chars). Only pass if changing. Call list_clients first and reuse the exact existing name whenever this company is already tracked — a new name automatically creates a new client record."
          ),
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
      if (company_name !== undefined) {
        cleanUpdates.company_name = company_name;
        // Keep client_id in sync whenever the client name changes.
        cleanUpdates.client_id = await resolveOrCreateClient(supabase, company_name);
      }
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
    },
    async ({ slug }) => {
      const project = await getProjectBySlug(slug);
      return toolResult({
        ...project,
        test_url: `${getAppBaseUrl()}/test/${project.slug}`,
      });
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
        "Returns the CLIENT-FACING analytics/report share link for a UAT checklist — a read-only results dashboard, safe to send to clients. This is NOT the tester link. To get the link testers use to actually complete the checklist, use the `test_url` field returned by create_uat_checklist or get_uat_checklist instead.",
      inputSchema: {
        slug: z.string().describe("The UAT checklist slug"),
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
}
