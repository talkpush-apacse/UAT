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

    // Compute resolution counts for the prompt
    const resolvedCount = issues.filter((i) => i.resolutionStatus === "resolved").length
    const inProgressCount = issues.filter((i) => i.resolutionStatus === "in-progress").length
    const pendingCount = issues.filter((i) => i.resolutionStatus === "pending").length

    const prompt = `Summarize the following UAT results as a concise executive report. This report will be shared with enterprise stakeholders for internal presentation — it must be scannable, data-driven, and actionable.

PROJECT: ${project.company_name}
${project.test_scenario ? `SCENARIO: ${project.test_scenario}` : ""}

UAT STATISTICS:
- Checklist steps: ${totalSteps}
- Testers: ${totalTesters}
- Total test executions: ${totalExecutions}
- Pass: ${passCount} (${totalExecutions > 0 ? Math.round((passCount / totalExecutions) * 100) : 0}%)
- Fail: ${failCount} (${totalExecutions > 0 ? Math.round((failCount / totalExecutions) * 100) : 0}%)
- Up For Review: ${blockedCount} (${totalExecutions > 0 ? Math.round((blockedCount / totalExecutions) * 100) : 0}%)
- N/A: ${naCount}
- Not Yet Tested: ${notTestedCount}

RESOLUTION COUNTS:
- Resolved: ${resolvedCount}
- In Progress: ${inProgressCount}
- Pending: ${pendingCount}

${issues.length > 0 ? `STEPS WITH ISSUES (sorted by frequency):

${issueDetails}` : "No failed or blocked steps were recorded."}

---

Write the report using this exact structure and markdown formatting. Be concise — aim for a single-page read.

## UAT Status

Open with one bold status line summarizing overall health, e.g.:
**UAT Status: ON TRACK** — 92% pass rate across 150 test executions. 3 issues pending resolution.

Choose the appropriate status label:
- **ON TRACK** — pass rate ≥ 90% AND no unresolved critical bugs
- **NEEDS ATTENTION** — pass rate 70–89% OR some unresolved issues remain
- **AT RISK** — pass rate < 70% OR multiple critical unresolved bugs

Follow with 2–3 sentences: project name, number of testers, total executions, pass rate, and how many were flagged (Fail + Up For Review combined). Keep it tight.

## Key Findings

Group issues by pattern (steps with similar classifications or steps reported by multiple testers). For each group:
- Always reference the **step number** (e.g., "Step 4") and briefly describe what the step does
- State how many testers reported the issue (do NOT name individual testers)
- Include the Talkpush classification (Bug/Glitch, Configuration Issue, Expected Behavior, For Retesting)
- Include Talkpush remarks if available
- Note the current resolution status (Resolved / In Progress / Pending)

Use bullet points. If there are no issues, state that clearly in one sentence.

## Resolution Status

Present as a simple markdown table:

| Status | Count |
|---|---|
| Resolved | X |
| In Progress | X |
| Pending | X |

Add one sentence noting whether the resolution trend is healthy or if attention is needed.

## Recommendation

1–2 consultative sentences. Frame as advisory guidance, e.g., "We recommend resolving the 2 pending configuration issues before proceeding to sign-off." or "All critical items have been addressed — the UAT is ready for sign-off."

---

RULES:
- Do NOT include individual tester names anywhere in the output.
- Do NOT invent data — only reference what is provided above.
- Write in neutral third-person. Never use "you" or "your".
- Keep the tone professional but consultative — like a trusted advisor, not a cold report.
- Use short paragraphs, bullet points, and the table. Avoid long prose blocks.
- The entire report should fit in roughly one page / one screen.`

    // ── Call OpenAI API ──

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.1",
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: "You are a senior QA consultant who writes clear, scannable UAT executive summaries. Your tone is professional yet consultative — warm enough to feel like a trusted advisor, but always grounded in data. Write in neutral third-person (never use 'you/your'). Prioritize brevity: use short paragraphs, bullet points, and tables over long prose. Every sentence must earn its place.",
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
