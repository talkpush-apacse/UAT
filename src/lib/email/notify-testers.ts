import { BrevoClient } from "@getbrevo/brevo"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database"
import { resolutionGroup } from "@/lib/utils/resolution-status"
import { buildUatReviewedEmailHtml, buildUatReviewedEmailText } from "@/lib/email/uat-reviewed-email"
import { EMAIL_SENDER } from "@/lib/email/sender"

// Shared by the admin "Notify Testers" button (API route) and the MCP
// notify_testers tool, so both always compute and send exactly the same email.
// Server-side only. Callers are responsible for authenticating the request.

export const MAX_NOTIFY_MESSAGE_LENGTH = 1000

export type ReviewedRecipient = {
  testerId: string
  name: string
  email: string
  totalIssues: number
  resolvedCount: number
  inProgressCount: number
  retestCount: number
  pendingCount: number
}

export type ReviewedEmailPlan = {
  project: { id: string; slug: string; company_name: string }
  recipients: ReviewedRecipient[]
}

export function reviewedEmailSubject(companyName: string): string {
  return `Your UAT results for ${companyName} have been reviewed`
}

/**
 * Works out who would be emailed and each tester's issue counts. Sends
 * nothing. Returns null when the checklist doesn't exist. `testerIds` narrows
 * to specific testers; null means everyone registered on the checklist.
 */
export async function buildReviewedEmailPlan(
  supabase: SupabaseClient<Database>,
  slug: string,
  testerIds: string[] | null
): Promise<ReviewedEmailPlan | null> {
  // 1. Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, slug, company_name")
    .eq("slug", slug)
    .single()

  if (projectError || !project) return null

  // 2. Fetch testers
  const { data: testers } = await supabase
    .from("testers")
    .select("id, name, email")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })

  // Filter to only the requested tester IDs (if provided)
  const allTesters = testers || []
  const testerList = testerIds
    ? allTesters.filter((t) => testerIds.includes(t.id))
    : allTesters

  if (testerList.length === 0) return { project, recipients: [] }

  // 3. Fetch checklist items
  const { data: checklistItems } = await supabase
    .from("checklist_items")
    .select("id")
    .eq("project_id", project.id)

  const itemIds = (checklistItems || []).map((ci) => ci.id)
  if (itemIds.length === 0) return { project, recipients: [] }

  // 4. Fetch responses
  // No .in("tester_id", ...) filter here: checklist_item_id is already scoped
  // to this project's items, which fully determines project membership on its
  // own — adding the tester_id list too only inflates the request URL (this is
  // what caused a HeadersOverflowError on the admin dashboard's equivalent
  // query). Results are narrowed to the requested testers via the in-memory
  // tester_id comparisons in the per-tester loop below.
  const { data: responses } = await supabase
    .from("responses")
    .select("tester_id, checklist_item_id, status")
    .in("checklist_item_id", itemIds)

  // 5. Fetch admin reviews
  const { data: adminReviews } = await supabase
    .from("admin_reviews")
    .select("tester_id, checklist_item_id, resolution_status")
    .in("checklist_item_id", itemIds)

  const responseList = responses || []
  const reviewList = adminReviews || []

  const reviewMap = new Map(
    reviewList.map((r) => [`${r.tester_id}::${r.checklist_item_id}`, r])
  )

  const recipients: ReviewedRecipient[] = testerList.map((tester) => {
    // Count non-pass responses for this tester
    const nonPassResponses = responseList.filter(
      (r) => r.tester_id === tester.id && r.status !== null && r.status !== "Pass" && r.status !== "N/A"
    )

    // Count resolution statuses
    let resolvedCount = 0
    let inProgressCount = 0
    let retestCount = 0
    let pendingCount = 0

    for (const resp of nonPassResponses) {
      const review = reviewMap.get(`${tester.id}::${resp.checklist_item_id}`)
      const group = resolutionGroup(review?.resolution_status)
      if (group === "resolved") {
        resolvedCount++
      } else if (group === "in-progress") {
        inProgressCount++
      } else if (group === "retest") {
        retestCount++
      } else {
        pendingCount++
      }
    }

    return {
      testerId: tester.id,
      name: tester.name,
      email: tester.email,
      totalIssues: nonPassResponses.length,
      resolvedCount,
      inProgressCount,
      retestCount,
      pendingCount,
    }
  })

  return { project, recipients }
}

/**
 * Sends the "your UAT results have been reviewed" email to each recipient in
 * the plan. `baseUrl` is where the "View My Results" link points. The logo
 * always loads from the public app address (NEXT_PUBLIC_APP_URL), never from
 * wherever the admin happened to click send (e.g. localhost).
 */
export async function sendReviewedEmails(
  brevoKey: string,
  plan: ReviewedEmailPlan,
  options: { message: string; baseUrl: string }
): Promise<{ sent: number; errors: string[] }> {
  const brevo = new BrevoClient({ apiKey: brevoKey })
  const logoUrl = `${(process.env.NEXT_PUBLIC_APP_URL || options.baseUrl).trim().replace(/\/$/, "")}/talkpush-logo-wordmark.png`

  let sent = 0
  const errors: string[] = []

  for (const recipient of plan.recipients) {
    const emailInput = {
      firstName: recipient.name.split(" ")[0],
      companyName: plan.project.company_name,
      totalIssues: recipient.totalIssues,
      resolvedCount: recipient.resolvedCount,
      inProgressCount: recipient.inProgressCount,
      retestCount: recipient.retestCount,
      pendingCount: recipient.pendingCount,
      resultsUrl: `${options.baseUrl}/test/${plan.project.slug}/results?tester=${recipient.testerId}`,
      logoUrl,
      message: options.message,
    }

    try {
      await brevo.transactionalEmails.sendTransacEmail({
        sender: EMAIL_SENDER,
        to: [{ email: recipient.email, name: recipient.name }],
        subject: reviewedEmailSubject(plan.project.company_name),
        htmlContent: buildUatReviewedEmailHtml(emailInput),
        textContent: buildUatReviewedEmailText(emailInput),
      })
      sent++
    } catch (emailErr) {
      const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr)
      console.error(`Failed to send email to ${recipient.email}:`, errMsg)
      errors.push(`${recipient.name}: ${errMsg}`)
    }
  }

  return { sent, errors }
}
