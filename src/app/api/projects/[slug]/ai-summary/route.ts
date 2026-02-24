import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  Data types for the structured prompt                               */
/* ------------------------------------------------------------------ */

interface StepIssue {
  stepNumber: number
  actor: string
  action: string
  testerName: string
  testerStatus: string
  testerComment: string | null
  talkpushFinding: string | null
  talkpushNotes: string | null
  resolutionStatus: string
}

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[slug]/ai-summary                               */
/* ------------------------------------------------------------------ */

export async function POST(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // Admin-only endpoint
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured. Add it to your environment variables." },
        { status: 500 }
      )
    }

    const supabase = createAdminClient()

    // 1. Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, slug, company_name, test_scenario")
      .eq("slug", params.slug)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // 2. Fetch checklist items
    const { data: checklistItems } = await supabase
      .from("checklist_items")
      .select("id, step_number, path, actor, action, crm_module, sort_order")
      .eq("project_id", project.id)
      .order("sort_order")

    const items = checklistItems || []
    const itemIds = items.map((ci) => ci.id)
    const totalSteps = items.length

    if (totalSteps === 0) {
      return NextResponse.json(
        { error: "No checklist items found for this project." },
        { status: 400 }
      )
    }

    // 3. Fetch testers
    const { data: testers } = await supabase
      .from("testers")
      .select("id, name, email")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true })

    const testerList = testers || []
    const testerIds = testerList.map((t) => t.id)
    const totalTesters = testerList.length

    // 4. Fetch responses
    let responses: {
      id: string
      tester_id: string
      checklist_item_id: string
      status: string | null
      comment: string | null
    }[] = []

    if (testerIds.length > 0 && itemIds.length > 0) {
      const { data } = await supabase
        .from("responses")
        .select("id, tester_id, checklist_item_id, status, comment")
        .in("tester_id", testerIds)
        .in("checklist_item_id", itemIds)
      responses = data || []
    }

    // 5. Fetch admin reviews
    let adminReviews: {
      checklist_item_id: string
      tester_id: string
      behavior_type: string | null
      resolution_status: string
      notes: string | null
    }[] = []

    if (testerIds.length > 0 && itemIds.length > 0) {
      const { data } = await supabase
        .from("admin_reviews")
        .select("checklist_item_id, tester_id, behavior_type, resolution_status, notes")
        .in("tester_id", testerIds)
        .in("checklist_item_id", itemIds)
      adminReviews = data || []
    }

    // ── Compute aggregates ──

    const totalExecutions = totalSteps * totalTesters
    const answeredResponses = responses.filter((r) => r.status !== null)
    const passCount = answeredResponses.filter((r) => r.status === "Pass").length
    const failCount = answeredResponses.filter((r) => r.status === "Fail").length
    const blockedCount = answeredResponses.filter((r) => r.status === "Blocked").length
    const naCount = answeredResponses.filter((r) => r.status === "N/A").length
    const notTestedCount = totalExecutions - answeredResponses.length

    // Build maps for lookups
    const itemMap = new Map(items.map((i) => [i.id, i]))
    const testerMap = new Map(testerList.map((t) => [t.id, t]))
    const reviewMap = new Map(
      adminReviews.map((r) => [`${r.tester_id}::${r.checklist_item_id}`, r])
    )

    // Build detailed issue list (Fail + Blocked responses)
    const issues: StepIssue[] = []
    responses.forEach((r) => {
      if (r.status !== "Fail" && r.status !== "Blocked") return
      const item = itemMap.get(r.checklist_item_id)
      const tester = testerMap.get(r.tester_id)
      if (!item || !tester) return
      const review = reviewMap.get(`${r.tester_id}::${r.checklist_item_id}`)
      issues.push({
        stepNumber: item.step_number,
        actor: item.actor,
        action: item.action,
        testerName: tester.name,
        testerStatus: r.status,
        testerComment: r.comment || null,
        talkpushFinding: review?.behavior_type || null,
        talkpushNotes: review?.notes || null,
        resolutionStatus: review?.resolution_status || "pending",
      })
    })

    // Group issues by step to find recurring patterns
    const stepIssueMap = new Map<number, StepIssue[]>()
    issues.forEach((issue) => {
      const existing = stepIssueMap.get(issue.stepNumber) || []
      existing.push(issue)
      stepIssueMap.set(issue.stepNumber, existing)
    })

    // Sort by frequency (most reported first)
    const stepIssueSorted = Array.from(stepIssueMap.entries())
      .sort((a, b) => b[1].length - a[1].length)

    // ── Build prompt ──

    const issueDetails = stepIssueSorted
      .map(([stepNum, stepIssues]) => {
        const firstIssue = stepIssues[0]
        const reports = stepIssues
          .map((si) => {
            const parts = [
              `    - Tester: ${si.testerName}`,
              `      Status: ${si.testerStatus}`,
            ]
            if (si.testerComment) parts.push(`      Comment: "${si.testerComment}"`)
            if (si.talkpushFinding) parts.push(`      Talkpush Finding: ${si.talkpushFinding}`)
            if (si.talkpushNotes) parts.push(`      Talkpush Remarks: "${si.talkpushNotes}"`)
            parts.push(`      Resolution: ${si.resolutionStatus}`)
            return parts.join("\n")
          })
          .join("\n")

        return `  Step ${stepNum} (${firstIssue.actor}): ${firstIssue.action}
  Reported by ${stepIssues.length} tester(s):
${reports}`
      })
      .join("\n\n")

    const prompt = `You are a QA analyst summarizing User Acceptance Testing (UAT) results for a Talkpush implementation project.

PROJECT: ${project.company_name}
${project.test_scenario ? `SCENARIO: ${project.test_scenario}` : ""}

UAT STATISTICS:
- Total checklist steps: ${totalSteps}
- Number of testers: ${totalTesters}
- Total test executions (steps × testers): ${totalExecutions}
- Pass: ${passCount} (${totalExecutions > 0 ? Math.round((passCount / totalExecutions) * 100) : 0}%)
- Fail: ${failCount} (${totalExecutions > 0 ? Math.round((failCount / totalExecutions) * 100) : 0}%)
- Up For Review (Blocked): ${blockedCount} (${totalExecutions > 0 ? Math.round((blockedCount / totalExecutions) * 100) : 0}%)
- N/A: ${naCount}
- Not Yet Tested: ${notTestedCount}

${issues.length > 0 ? `STEPS WITH ISSUES (sorted by frequency of reports):

${issueDetails}` : "No failed or blocked steps recorded."}

TESTER NAMES: ${testerList.map((t) => t.name).join(", ")}

---

Write a concise executive summary of this UAT in the following structure. Use markdown formatting.

1. **Overview** — One paragraph: project name, number of testers, total test executions, and overall pass rate. Mention how many test executions passed versus how many were flagged (Fail + Up For Review combined).

2. **Key Findings** — Analyze the steps with issues. Group by recurring patterns (i.e., steps reported by multiple testers or steps with similar findings). For each finding:
   - Mention the step number and what the step does
   - How many testers reported it
   - What the Talkpush finding/classification is (Bug/Glitch, Configuration Issue, Expected Behavior, For Retesting)
   - Include the Talkpush remarks if available
   - Note the resolution status

3. **Resolution Status** — Brief summary of how many issues are pending, in-progress, or resolved.

4. **Recommendation** — One or two sentences about whether the UAT is ready for sign-off or if there are outstanding items to address.

Keep the tone professional and factual. This will be shared internally at Talkpush. Do not invent data — only reference what is provided above.`

    // ── Call OpenAI API ──

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: "You are a QA analyst who writes concise, professional UAT executive summaries for Talkpush, a hiring tech SaaS company.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text()
      console.error("OpenAI API error:", openaiResponse.status, errorBody)
      return NextResponse.json(
        { error: `AI service error (${openaiResponse.status}). Please try again.` },
        { status: 502 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await openaiResponse.json()
    const summaryText = result?.choices?.[0]?.message?.content ?? "No summary generated."

    return NextResponse.json({
      summary: summaryText,
      stats: {
        totalSteps,
        totalTesters,
        totalExecutions,
        passCount,
        failCount,
        blockedCount,
        naCount,
        notTestedCount,
        issueCount: issues.length,
      },
    })
  } catch (err) {
    console.error("AI Summary API - unexpected error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
