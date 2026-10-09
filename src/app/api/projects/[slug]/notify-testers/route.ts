import { NextResponse } from "next/server"
import { BrevoClient } from "@getbrevo/brevo"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import { resolutionGroup } from "@/lib/utils/resolution-status"
import { buildUatReviewedEmailHtml, buildUatReviewedEmailText } from "@/lib/email/uat-reviewed-email"

export const dynamic = "force-dynamic"

const MAX_MESSAGE_LENGTH = 1000

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[slug]/notify-testers                           */
/*  Sends a "review complete" email to each specified tester.          */
/*  Accepts an optional testerIds array to target specific testers    */
/*  and an optional plain-text message shown in every email.           */
/* ------------------------------------------------------------------ */

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // Admin-only endpoint
    const isAdmin = await verifyAdminSession()
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const brevoKey = process.env.BREVO_API_KEY
    if (!brevoKey) {
      return NextResponse.json(
        { error: "BREVO_API_KEY is not configured. Add it to your environment variables." },
        { status: 500 }
      )
    }

    // Parse the origin and optional testerIds from the request body
    const body = await request.json().catch(() => ({}))
    const origin: string | null = body.origin ?? null
    const testerIds: string[] | null = Array.isArray(body.testerIds) ? body.testerIds : null
    const message: string =
      typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : ""
    const baseUrl = (origin || process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app").trim()
    // The logo must load from the public app address, not from wherever the admin clicked send (e.g. localhost).
    const logoUrl = `${(process.env.NEXT_PUBLIC_APP_URL || baseUrl).trim().replace(/\/$/, "")}/talkpush-logo-wordmark.png`

    const brevo = new BrevoClient({ apiKey: brevoKey })
    const supabase = createAdminClient()

    // 1. Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, slug, company_name")
      .eq("slug", params.slug)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "UAT checklist not found" }, { status: 404 })
    }

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

    if (testerList.length === 0) {
      return NextResponse.json({ sent: 0, errors: [] })
    }

    // 3. Fetch checklist items
    const { data: checklistItems } = await supabase
      .from("checklist_items")
      .select("id")
      .eq("project_id", project.id)

    const itemIds = (checklistItems || []).map((ci) => ci.id)
    if (itemIds.length === 0) {
      return NextResponse.json({ sent: 0, errors: [] })
    }

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

    // Build per-tester stats
    const reviewMap = new Map(
      reviewList.map((r) => [`${r.tester_id}::${r.checklist_item_id}`, r])
    )

    let sentCount = 0
    const errors: string[] = []

    for (const tester of testerList) {
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

      const totalIssues = nonPassResponses.length
      const resultsUrl = `${baseUrl}/test/${project.slug}/results?tester=${tester.id}`
      const firstName = tester.name.split(" ")[0]

      const emailInput = {
        firstName,
        companyName: project.company_name,
        totalIssues,
        resolvedCount,
        inProgressCount,
        retestCount,
        pendingCount,
        resultsUrl,
        logoUrl,
        message,
      }

      try {
        await brevo.transactionalEmails.sendTransacEmail({
          sender: { name: "Talkpush APAC", email: "updates@se-talkpush.com" },
          to: [{ email: tester.email, name: tester.name }],
          subject: `Your UAT results for ${project.company_name} have been reviewed`,
          htmlContent: buildUatReviewedEmailHtml(emailInput),
          textContent: buildUatReviewedEmailText(emailInput),
        })
        sentCount++
      } catch (emailErr) {
        const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr)
        console.error(`Failed to send email to ${tester.email}:`, errMsg)
        errors.push(`${tester.name}: ${errMsg}`)
      }
    }

    return NextResponse.json({ sent: sentCount, errors })
  } catch (err) {
    console.error("Notify testers API - unexpected error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
