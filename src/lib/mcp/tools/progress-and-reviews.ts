import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProjectBySlug, toolResult } from "@/lib/mcp/helpers";

export function registerProgressTools(server: McpServer) {
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
        "Get admin review data for all non-pass UAT steps in a checklist, grouped by tester. Returns the tester's own remark, behavior type, resolution status, and admin findings/comments for each flagged step. Used for generating AI summaries of UAT testing results.",
      inputSchema: {
        slug: z.string().describe("The UAT checklist slug"),
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
        comment: string | null;
      }[] = [];
      if (itemIds.length > 0) {
        const { data: resp, error: respError } = await supabase
          .from("responses")
          .select("tester_id, checklist_item_id, status, comment")
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
              tester_comment: resp.comment ?? null,
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
}
