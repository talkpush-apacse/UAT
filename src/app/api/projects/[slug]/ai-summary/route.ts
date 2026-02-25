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

    const prompt = `Summarize the following UAT results as a concise executive report. The reader may NOT have participated in the UAT sessions — the report must be fully self-contained so that any stakeholder can understand what was tested, what was found, and what needs to happen next.

PROJECT: ${project.company_name}
${project.test_scenario ? `SCENARIO: ${project.test_scenario}` : ""}
PLATFORM UNDER TEST: Talkpush — an automated candidate engagement platform used for high-volume hiring. It handles chatbot-based candidate screening, recruiter workflows, and integration with the client's hiring systems.

UAT STATISTICS:
- Checklist steps: ${totalSteps}
- Testers: ${totalTesters}
- Total test executions: ${totalExecutions}
- Pass: ${passCount} (${totalExecutions > 0 ? Math.round((passCount / totalExecutions) * 100) : 0}%) — step worked as expected
- Fail: ${failCount} (${totalExecutions > 0 ? Math.round((failCount / totalExecutions) * 100) : 0}%) — step did not work as expected
- Up For Review: ${blockedCount} (${totalExecutions > 0 ? Math.round((blockedCount / totalExecutions) * 100) : 0}%) — step needs further clarification from the tester (e.g., minor verbiage changes, translation updates, cosmetic feedback). These are NOT failures.
- N/A: ${naCount}
- Not Yet Tested: ${notTestedCount}

RESOLUTION COUNTS:
- Resolved: ${resolvedCount}
- In Progress: ${inProgressCount}
- Pending: ${pendingCount}

CLASSIFICATION GLOSSARY (for your reference — do NOT reproduce this glossary in the output):
- "Bug/Glitch" = a technical defect in the platform. Owner: Talkpush.
- "Configuration Issue" = the platform works but a setting needs adjusting for this client's setup. Owner: Talkpush.
- "Expected Behavior" = the platform is working as designed; the tester expected something different. Owner: no action needed.
- "For Retesting" = the issue may have been fixed or was intermittent; needs the tester to verify again. Owner: Talkpush + Tester.

${issues.length > 0 ? `STEPS WITH ISSUES (sorted by frequency):

${issueDetails}` : "No failed or blocked steps were recorded."}

---

Write the report using this exact structure and markdown formatting. Be concise — aim for a single-page read.

## UAT Status

Start with a one-sentence **project context line** that any reader can understand, even with zero background. Describe what is being tested in plain business language. Example:
"${project.company_name} is conducting User Acceptance Testing on the Talkpush hiring platform to validate the end-to-end candidate experience — from initial application through recruiter review${project.test_scenario ? ` — specifically for the ${project.test_scenario} workflow` : ""}."

Then add one bold status line summarizing overall health, e.g.:
**UAT Status: ON TRACK** — 92% pass rate across 150 test executions. 3 items pending resolution.

Choose the appropriate status label:
- **ON TRACK** — pass rate ≥ 90% AND no unresolved critical bugs
- **NEEDS ATTENTION** — pass rate 70–89% OR some unresolved issues remain
- **AT RISK** — pass rate < 70% OR multiple critical unresolved bugs

Follow with 2–3 sentences: number of testers, total executions, pass rate, how many failed, and how many are up for review (clarify that "Up For Review" items are not failures — they are steps where testers flagged minor clarifications such as wording changes or translation updates).

## Key Findings

Group issues by pattern (steps with similar classifications or steps reported by multiple testers). For each finding, use this format:

- **Step [number]**: [plain-English description of what the step does and who it affects — candidate, recruiter, or the system]
  - Reported by [X] tester(s) · Classification: [type] · Owner: [Talkpush or Client] · Status: [Resolved / In Progress / Pending]
  - **Impact**: [One sentence — what does this mean for the hiring process? Frame it in terms of the people affected: candidates, recruiters, or hiring managers. Example: "Candidates in the Philippines may experience delayed SMS invitations, slowing initial engagement."]
  - Talkpush remarks: "[remarks if available]"

IMPORTANT — when describing findings:
- Describe each step's action in plain business language that a non-technical reader can understand.
- Translate internal/technical terms: say "candidate messaging" not "SMS gateway"; say "candidate screening scores" not "knockout scores"; say "recruiter dashboard" not "CRM profile view"; say "client's hiring system" not "ATS".
- Always state who owns the resolution: **Talkpush** (for bugs and configuration issues) or **Client** (if action is needed from the client's side). If the classification is "Expected Behavior", state "No action needed."
- If the classification is "For Retesting", note that this item has potentially been addressed and is awaiting tester verification.

Use bullet points. If there are no issues, state that clearly in one sentence.

## Resolution Status

Present as a simple markdown table:

| Status | Count |
|---|---|
| Resolved | X |
| In Progress | X |
| Pending | X |

Add one sentence noting whether resolution progress is healthy or if attention is needed.

## Recommendation

1–2 consultative sentences. Frame as advisory guidance. Focus on what needs to happen next — do NOT commit to specific dates or timelines. Examples:
- "We recommend addressing the 2 pending platform defects before proceeding to sign-off."
- "All critical items have been resolved — the UAT is ready for final sign-off."
- "Three configuration items remain in progress with the Talkpush team. Once resolved and retested, the UAT can proceed to sign-off."

---

RULES:
- Do NOT include individual tester names anywhere in the output.
- Do NOT invent data — only reference what is provided above.
- Do NOT include specific dates, deadlines, or time estimates.
- Write in neutral third-person. Never use "you" or "your".
- Keep the tone professional but consultative — like a trusted advisor, not a cold report.
- Use plain business language throughout. Avoid technical jargon, acronyms, or platform-specific terms. If a technical concept must be referenced, explain it in parentheses on first use.
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
        max_completion_tokens: 1500,
        messages: [
          {
            role: "system",
            content: "You are a senior QA consultant writing UAT executive summaries for enterprise stakeholders who may have NO technical background and did NOT participate in the testing sessions. Your job is to make the report fully self-contained and understandable to any reader. Use plain business language — never use technical jargon, platform acronyms, or internal terminology without explaining it. Frame every finding in terms of business impact: who is affected (candidates, recruiters, hiring managers) and how. Your tone is professional yet consultative — a trusted advisor, not a cold report. Write in neutral third-person. Prioritize brevity: short paragraphs, bullet points, and tables. Every sentence must earn its place. Never commit to dates or timelines.",
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
      // Surface the upstream message so admins can diagnose without checking server logs
      let detail = ""
      try {
        const parsed = JSON.parse(errorBody)
        detail = parsed?.error?.message ?? ""
      } catch { /* not JSON, ignore */ }
      return NextResponse.json(
        { error: `AI service error (${openaiResponse.status}). ${detail || "Please try again."}` },
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
