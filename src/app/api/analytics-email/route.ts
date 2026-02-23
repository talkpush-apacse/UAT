import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { verifyAdminSession } from "@/lib/utils/admin-auth"

interface FailedStep {
  stepNumber: number
  actor: string
  action: string
  testerName: string
  status: string
  behaviorType: string | null
  resolutionStatus: string
}

interface AnalyticsSummary {
  totalTesters: number
  completedTesters: number
  totalSteps: number
  passCount: number
  failCount: number
  blockedCount: number
  naCount: number
  notTestedCount: number
  failedSteps: FailedStep[]
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminSession()
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { recipientEmail: string; projectName: string; summary: AnalyticsSummary }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { recipientEmail, projectName, summary } = body

  // Basic validation
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 })
  }
  if (!projectName || !summary) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (!Array.isArray(summary.failedSteps) || summary.failedSteps.length > 500) {
    return NextResponse.json({ error: "Invalid summary data" }, { status: 400 })
  }

  // Coerce numeric fields — TypeScript types are compile-time only; the server
  // must not trust client-sent values are actually numbers at runtime.
  const safeInt = (n: unknown) =>
    typeof n === "number" && isFinite(n) ? Math.floor(n) : 0
  const counts = {
    completedTesters: safeInt(summary.completedTesters),
    totalTesters: safeInt(summary.totalTesters),
    passCount: safeInt(summary.passCount),
    failCount: safeInt(summary.failCount),
    blockedCount: safeInt(summary.blockedCount),
    naCount: safeInt(summary.naCount),
    notTestedCount: safeInt(summary.notTestedCount),
  }

  const totalSteps = safeInt(summary.totalSteps)
  const passRate =
    totalSteps === 0
      ? "N/A"
      : `${Math.round((counts.passCount / (totalSteps * Math.max(counts.totalTesters, 1))) * 100)}%`

  const failedRowsHtml =
    summary.failedSteps.length === 0
      ? `<tr><td colspan="6" style="padding:16px;text-align:center;color:#6b7280;font-style:italic;">No failed or blocked steps</td></tr>`
      : summary.failedSteps
          .map(
            (s) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;font-size:12px;color:#374151;white-space:nowrap;">${s.stepNumber}</td>
      <td style="padding:10px 12px;font-size:12px;color:#374151;">${escapeHtml(s.actor)}</td>
      <td style="padding:10px 12px;font-size:12px;color:#374151;">${escapeHtml(s.action)}</td>
      <td style="padding:10px 12px;font-size:12px;color:#374151;">${escapeHtml(s.testerName)}</td>
      <td style="padding:10px 12px;font-size:12px;">
        <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${s.status === "Fail" ? "#fee2e2" : "#fef3c7"};color:${s.status === "Fail" ? "#dc2626" : "#d97706"};">
          ${escapeHtml(s.status)}
        </span>
      </td>
      <td style="padding:10px 12px;font-size:12px;color:#6b7280;">${escapeHtml(s.behaviorType ?? "—")}</td>
    </tr>`
          )
          .join("")

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:700px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="background:#00BFA5;padding:28px 32px;">
      <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.8);font-weight:500;">UAT Analytics Summary</p>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#ffffff;">${escapeHtml(projectName)}</h1>
    </div>

    <!-- Stat cards -->
    <div style="padding:28px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px 0;">
        <tr>
          <td style="width:25%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;vertical-align:top;">
            <div style="font-size:26px;font-weight:700;color:#16a34a;">${counts.completedTesters}/${counts.totalTesters}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;">Testers Completed</div>
          </td>
          <td style="width:25%;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;vertical-align:top;">
            <div style="font-size:26px;font-weight:700;color:#16a34a;">${passRate}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;">Pass Rate</div>
          </td>
          <td style="width:25%;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;text-align:center;vertical-align:top;">
            <div style="font-size:26px;font-weight:700;color:#dc2626;">${counts.failCount}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;">Failures</div>
          </td>
          <td style="width:25%;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;text-align:center;vertical-align:top;">
            <div style="font-size:26px;font-weight:700;color:#d97706;">${counts.blockedCount}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:4px;font-weight:500;">Blocked</div>
          </td>
        </tr>
      </table>

      <!-- Status breakdown row -->
      <div style="margin-top:20px;padding:14px 16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
        <span style="font-size:12px;color:#6b7280;font-weight:500;">Step Results: </span>
        <span style="font-size:12px;color:#16a34a;font-weight:600;">${counts.passCount} Pass</span>
        <span style="font-size:12px;color:#9ca3af;margin:0 6px;">·</span>
        <span style="font-size:12px;color:#dc2626;font-weight:600;">${counts.failCount} Fail</span>
        <span style="font-size:12px;color:#9ca3af;margin:0 6px;">·</span>
        <span style="font-size:12px;color:#d97706;font-weight:600;">${counts.blockedCount} Blocked</span>
        <span style="font-size:12px;color:#9ca3af;margin:0 6px;">·</span>
        <span style="font-size:12px;color:#94a3b8;font-weight:600;">${counts.naCount} N/A</span>
        <span style="font-size:12px;color:#9ca3af;margin:0 6px;">·</span>
        <span style="font-size:12px;color:#d1d5db;font-weight:600;">${counts.notTestedCount} Not Tested</span>
        <span style="font-size:12px;color:#9ca3af;margin:0 6px;">·</span>
        <span style="font-size:12px;color:#374151;font-weight:500;">${totalSteps} Total Steps</span>
      </div>
    </div>

    <!-- Steps Requiring Attention -->
    <div style="padding:28px 32px;">
      <h2 style="margin:0 0 16px;font-size:14px;font-weight:600;color:#111827;border-bottom:2px solid #f3f4f6;padding-bottom:10px;">
        Steps Requiring Attention (${summary.failedSteps.length > 0 ? safeInt(summary.failedSteps.length) : 0})
      </h2>
      <div style="overflow-x:auto;border-radius:8px;border:1px solid #e5e7eb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:560px;">
          <thead>
            <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;white-space:nowrap;">#</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Actor</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Step</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Tester</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Status</th>
              <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;">Finding</th>
            </tr>
          </thead>
          <tbody>
            ${failedRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">Generated by Talkpush UAT Platform · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
  </div>
</body>
</html>`

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: "UAT Platform <noreply@talkpush.com>",
      to: recipientEmail,
      subject: `UAT Analytics Summary — ${projectName}`,
      html,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Email send error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
