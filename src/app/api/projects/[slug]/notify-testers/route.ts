import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminSession } from "@/lib/utils/admin-auth"
import {
  MAX_NOTIFY_MESSAGE_LENGTH,
  buildReviewedEmailPlan,
  sendReviewedEmails,
} from "@/lib/email/notify-testers"

export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  POST /api/projects/[slug]/notify-testers                           */
/*  Sends a "review complete" email to each specified tester.          */
/*  Accepts an optional testerIds array to target specific testers    */
/*  and an optional plain-text message shown in every email.           */
/*  The who-gets-what logic and the sending live in                   */
/*  lib/email/notify-testers.ts (shared with the MCP notify tool).    */
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
      typeof body.message === "string" ? body.message.trim().slice(0, MAX_NOTIFY_MESSAGE_LENGTH) : ""
    const baseUrl = (origin || process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app").trim()

    const plan = await buildReviewedEmailPlan(createAdminClient(), params.slug, testerIds)
    if (!plan) {
      return NextResponse.json({ error: "UAT checklist not found" }, { status: 404 })
    }

    if (plan.recipients.length === 0) {
      return NextResponse.json({ sent: 0, errors: [] })
    }

    const { sent, errors } = await sendReviewedEmails(brevoKey, plan, { message, baseUrl })
    return NextResponse.json({ sent, errors })
  } catch (err) {
    console.error("Notify testers API - unexpected error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
