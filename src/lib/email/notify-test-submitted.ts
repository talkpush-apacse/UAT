import { BrevoClient } from "@getbrevo/brevo"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  buildTestSubmittedEmailHtml,
  buildTestSubmittedEmailText,
  buildTestSubmittedSubject,
} from "@/lib/email/test-submitted-email"

// Server-side only (uses the service role key). Do not import from client
// components, and do not add 'use server' here: that would expose it as a
// public action.

const SUBMIT_NOTIFICATION_TIMEOUT_MS = 5000

// A sender Brevo currently accepts. The tester-facing "reviewed" email still
// uses updates@se-talkpush.com, which Brevo rejected as not validated.
const SENDER_EMAIL = "operations@talkpush.com"

/**
 * Emails the checklist's notification list that a tester just submitted.
 * Never throws and never takes longer than the timeout, so it can't break or
 * stall the tester's submit. Does nothing when no one is on the list.
 */
export async function notifyTestSubmitted(testerId: string): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      sendNotification(testerId),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          console.error("Submit notification timed out")
          resolve()
        }, SUBMIT_NOTIFICATION_TIMEOUT_MS)
      }),
    ])
  } catch {
    // Short message only: no tester data or raw error text in logs.
    console.error("Submit notification failed")
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function sendNotification(testerId: string): Promise<void> {
  const brevoKey = process.env.BREVO_API_KEY
  if (!brevoKey) {
    console.error("Submit notification skipped: email is not configured")
    return
  }

  const supabase = createAdminClient()

  const { data: tester } = await supabase
    .from("testers")
    .select("id, name, email, project_id")
    .eq("id", testerId)
    .single()
  if (!tester) return

  const { data: recipients } = await supabase
    .from("project_notification_recipients")
    .select("email")
    .eq("project_id", tester.project_id)
  const to = (recipients ?? []).map((r) => ({ email: r.email }))
  if (to.length === 0) return

  const { data: project } = await supabase
    .from("projects")
    .select("slug, title, company_name")
    .eq("id", tester.project_id)
    .single()
  if (!project) return

  // Same counting rules as the tester results page: steps only (phase
  // headers are never tested), and an issue is anything answered that is
  // not Pass or N/A (Fail, Blocked, Up For Review).
  const { data: items } = await supabase
    .from("checklist_items")
    .select("id")
    .eq("project_id", tester.project_id)
    .eq("item_type", "step")
  const itemIds = (items ?? []).map((i) => i.id)

  let statuses: (string | null)[] = []
  if (itemIds.length > 0) {
    const { data: responses } = await supabase
      .from("responses")
      .select("status")
      .eq("tester_id", tester.id)
      .in("checklist_item_id", itemIds)
    statuses = (responses ?? []).map((r) => r.status)
  }
  const answered = statuses.filter((s): s is string => s !== null)
  const passed = answered.filter((s) => s === "Pass").length
  const notApplicable = answered.filter((s) => s === "N/A").length

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "")
  const input = {
    testerName: tester.name,
    testerEmail: tester.email,
    checklistTitle: project.title || project.company_name,
    companyName: project.company_name,
    submittedOn: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date()),
    stepsTested: answered.length,
    passed,
    issues: answered.length - passed - notApplicable,
    notApplicable,
    reviewUrl: `${baseUrl}/admin/projects/${project.slug}/review`,
    editUrl: `${baseUrl}/admin/projects/${project.slug}/edit`,
    logoUrl: `${baseUrl}/talkpush-logo-wordmark.png`,
  }

  const brevo = new BrevoClient({ apiKey: brevoKey })
  await brevo.transactionalEmails.sendTransacEmail({
    sender: { name: "Talkpush APAC", email: SENDER_EMAIL },
    to,
    subject: buildTestSubmittedSubject(tester.name, project.company_name),
    htmlContent: buildTestSubmittedEmailHtml(input),
    textContent: buildTestSubmittedEmailText(input),
  })
}
