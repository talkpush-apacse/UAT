import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[slug]/notify-testers                           */
/*  Sends a one-time "review complete" email to each tester who        */
/*  reported at least one non-pass step.                               */
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

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured. Add it to your environment variables." },
        { status: 500 }
      )
    }

    // Parse the origin and optional tester filter from the request
    const { origin, testerIds: selectedTesterIds } = await request.json().catch(() => ({ origin: null, testerIds: null }))
    const baseUrl = origin || process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app"

    const resend = new Resend(resendKey)
    const supabase = createAdminClient()

    // 1. Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, slug, company_name")
      .eq("slug", params.slug)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // 2. Fetch testers
    const { data: testers } = await supabase
      .from("testers")
      .select("id, name, email")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true })

    let testerList = testers || []
    // If the client sent a specific set of tester IDs, restrict to those
    if (Array.isArray(selectedTesterIds) && selectedTesterIds.length > 0) {
      const allowed = new Set(selectedTesterIds as string[])
      testerList = testerList.filter((t) => allowed.has(t.id))
    }
    if (testerList.length === 0) {
      return NextResponse.json({ sent: 0, errors: [] })
    }

    const testerIds = testerList.map((t) => t.id)

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
    const { data: responses } = await supabase
      .from("responses")
      .select("tester_id, checklist_item_id, status")
      .in("tester_id", testerIds)
      .in("checklist_item_id", itemIds)

    // 5. Fetch admin reviews
    const { data: adminReviews } = await supabase
      .from("admin_reviews")
      .select("tester_id, checklist_item_id, resolution_status")
      .in("tester_id", testerIds)
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
      // Only email testers who reported at least one non-pass step
      const testerResponses = responseList.filter(
        (r) => r.tester_id === tester.id && r.status !== null && r.status !== "Pass" && r.status !== "N/A"
      )

      if (testerResponses.length === 0) continue

      // Count resolution statuses for this tester
      let resolvedCount = 0
      let inProgressCount = 0
      let pendingCount = 0

      for (const resp of testerResponses) {
        const review = reviewMap.get(`${tester.id}::${resp.checklist_item_id}`)
        if (review?.resolution_status === "resolved") {
          resolvedCount++
        } else if (review?.resolution_status === "in-progress") {
          inProgressCount++
        } else {
          pendingCount++
        }
      }

      const totalIssues = testerResponses.length
      const resultsUrl = `${baseUrl}/test/${project.slug}/results?tester=${tester.id}`
      const firstName = tester.name.split(" ")[0]

      // Build HTML email
      const html = buildEmailHtml({
        firstName,
        companyName: project.company_name,
        totalIssues,
        resolvedCount,
        inProgressCount,
        pendingCount,
        resultsUrl,
      })

      try {
        await resend.emails.send({
          from: "Talkpush UAT <noreply@updates.talkpush.com>",
          to: tester.email,
          subject: `Your UAT results for ${project.company_name} have been reviewed`,
          html,
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

/* ------------------------------------------------------------------ */
/*  Email HTML template                                                */
/* ------------------------------------------------------------------ */

function buildEmailHtml({
  firstName,
  companyName,
  totalIssues,
  resolvedCount,
  inProgressCount,
  pendingCount,
  resultsUrl,
}: {
  firstName: string
  companyName: string
  totalIssues: number
  resolvedCount: number
  inProgressCount: number
  pendingCount: number
  resultsUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UAT Results Reviewed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo / Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; background-color: #00BFA5; color: white; font-weight: 700; font-size: 14px; padding: 8px 16px; border-radius: 8px; letter-spacing: 0.5px;">
        TALKPUSH UAT
      </div>
    </div>

    <!-- Main card -->
    <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
      <h1 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 8px;">
        Hi ${firstName},
      </h1>
      <p style="font-size: 15px; color: #6b7280; margin: 0 0 24px; line-height: 1.6;">
        We've reviewed your UAT findings for <strong style="color: #111827;">${companyName}</strong>. Here's a quick summary:
      </p>

      <!-- Stats -->
      <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: #6b7280;">Issues reported</td>
            <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #111827; text-align: right;">${totalIssues}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: #16a34a;">Resolved</td>
            <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #16a34a; text-align: right;">${resolvedCount}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: #2563eb;">In Progress</td>
            <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #2563eb; text-align: right;">${inProgressCount}</td>
          </tr>
          ${pendingCount > 0 ? `
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: #d97706;">Pending</td>
            <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #d97706; text-align: right;">${pendingCount}</td>
          </tr>
          ` : ""}
        </table>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="${resultsUrl}" style="display: inline-block; background-color: #00BFA5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 8px;">
          View My Results
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 24px; line-height: 1.5;">
      This is an automated message from Talkpush UAT.<br>
      You're receiving this because you participated in UAT testing.
    </p>
  </div>
</body>
</html>`
}
