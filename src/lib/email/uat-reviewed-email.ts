/* ------------------------------------------------------------------ */
/*  "Your UAT results have been reviewed" email                        */
/*                                                                    */
/*  Talkpush Sign look: warm paper page, white card, four-colour      */
/*  brand strip, ink button. Email apps cannot use CSS variables, so  */
/*  the Sign colours live in COLORS below. Layout is table-based with */
/*  inline styles so it renders in Outlook, Gmail and Apple Mail.     */
/* ------------------------------------------------------------------ */

const COLORS = {
  ink: "#121216",
  inkCream: "#F1EFE4",
  paper: "#FFFFF5",
  card: "#FFFFFF",
  hairline: "#D9D9DD",
  textSecondary: "#374151",
  lavenderWash: "#E7ECF8",
  sage: "#ACCDB5",
  lavender: "#BBCAF0",
  pink: "#F1C1F3",
  amber: "#F2B457",
}

const FONT = `'DM Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`

export type UatReviewedEmailInput = {
  firstName: string
  companyName: string
  totalIssues: number
  resolvedCount: number
  inProgressCount: number
  pendingCount: number
  resultsUrl: string
  logoUrl: string
  message: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function openCount(input: UatReviewedEmailInput): number {
  return input.inProgressCount + input.pendingCount
}

function preheader(input: UatReviewedEmailInput): string {
  if (input.totalIssues === 0) {
    return `You reported no issues for ${input.companyName}. Nothing more is needed from you.`
  }
  return `Your findings for ${input.companyName} have been reviewed: ${input.resolvedCount} resolved, ${openCount(input)} still open.`
}

function countRow(label: string, count: number, color: string, isLast: boolean): string {
  const border = isLast ? "" : `border-bottom: 1px solid ${COLORS.hairline};`
  return `
          <tr>
            <td width="14" style="padding: 12px 0 12px 0; ${border} vertical-align: middle;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="14" height="14" bgcolor="${color}" style="width: 14px; height: 14px; font-size: 0; line-height: 0; border-radius: 3px;">&nbsp;</td></tr></table>
            </td>
            <td style="padding: 12px 0 12px 12px; ${border} font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${COLORS.ink}; font-weight: 500;">${label}</td>
            <td align="right" style="padding: 12px 0; ${border} font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${COLORS.ink}; font-weight: 700;">${count}</td>
          </tr>`
}

export function buildUatReviewedEmailHtml(input: UatReviewedEmailInput): string {
  const firstName = escapeHtml(input.firstName)
  const companyName = escapeHtml(input.companyName)
  const resultsUrl = escapeHtml(input.resultsUrl)
  const logoUrl = escapeHtml(input.logoUrl)

  const noteBlock = input.message
    ? `
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td bgcolor="${COLORS.lavenderWash}" style="background-color: ${COLORS.lavenderWash}; border: 1px solid ${COLORS.hairline}; border-radius: 9px; padding: 16px;">
                <p style="margin: 0 0 6px 0; font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: 700; color: ${COLORS.ink};">A note from the Talkpush team</p>
                <p style="margin: 0; font-family: ${FONT}; font-size: 16px; line-height: 24px; font-weight: 500; color: ${COLORS.ink}; white-space: pre-wrap;">${escapeHtml(input.message)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : ""

  const summaryBlock =
    input.totalIssues === 0
      ? `
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <p style="margin: 0; font-family: ${FONT}; font-size: 16px; line-height: 24px; font-weight: 700; color: ${COLORS.ink};">You reported no issues. Nothing more is needed from you.</p>
        </td>
      </tr>`
      : `
      <tr>
        <td style="padding: 0 32px 24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td colspan="3" style="padding: 0 0 8px 0; border-bottom: 2px solid ${COLORS.ink}; font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${COLORS.ink}; font-weight: 700;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${COLORS.ink}; font-weight: 700;">Issues you reported</td>
                  <td align="right" style="font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${COLORS.ink}; font-weight: 700;">${input.totalIssues}</td>
                </tr></table>
              </td>
            </tr>${countRow("Resolved", input.resolvedCount, COLORS.sage, false)}${countRow("In progress", input.inProgressCount, COLORS.lavender, false)}${countRow("Pending review", input.pendingCount, COLORS.amber, true)}
          </table>
        </td>
      </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>Your UAT results have been reviewed</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.paper};">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; font-size: 1px; line-height: 1px; color: ${COLORS.paper};">${escapeHtml(preheader(input))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.paper}" style="background-color: ${COLORS.paper};">
    <tr>
      <td align="center" style="padding: 24px 16px 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px;">
          <!-- Brand strip -->
          <tr>
            <td style="border-radius: 9px 9px 0 0; overflow: hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="25%" height="6" bgcolor="${COLORS.amber}" style="height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                <td width="25%" height="6" bgcolor="${COLORS.pink}" style="height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                <td width="25%" height="6" bgcolor="${COLORS.lavender}" style="height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
                <td width="25%" height="6" bgcolor="${COLORS.sage}" style="height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
              </tr></table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td bgcolor="${COLORS.card}" style="background-color: ${COLORS.card}; border: 1px solid ${COLORS.hairline}; border-top: 0; border-radius: 0 0 9px 9px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 32px 32px 24px 32px;">
                    <img src="${logoUrl}" width="180" alt="Talkpush" style="display: block; border: 0; outline: none; text-decoration: none; width: 180px; height: auto; font-family: ${FONT}; font-size: 20px; font-weight: 700; color: ${COLORS.ink};">
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 8px 32px;">
                    <h1 style="margin: 0; font-family: ${FONT}; font-size: 24px; line-height: 32px; font-weight: 700; color: ${COLORS.ink};">Your UAT results have been reviewed</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <p style="margin: 0; font-family: ${FONT}; font-size: 16px; line-height: 24px; font-weight: 500; color: ${COLORS.textSecondary};">Hi ${firstName}, we've reviewed the issues you reported for <strong style="color: ${COLORS.ink};">${companyName}</strong>. Here's where they stand.</p>
                  </td>
                </tr>${noteBlock}${summaryBlock}
                <tr>
                  <td style="padding: 0 32px 16px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="${COLORS.ink}" style="background-color: ${COLORS.ink}; border-radius: 9px;">
                          <a href="${resultsUrl}" style="display: block; padding: 14px 24px; font-family: ${FONT}; font-size: 16px; line-height: 20px; font-weight: 700; color: ${COLORS.inkCream}; text-decoration: none; border-radius: 9px;">View My Results</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 32px 32px;">
                    <p style="margin: 0; font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: 500; color: ${COLORS.textSecondary};">Button not working? Copy this link into your browser:<br><a href="${resultsUrl}" style="color: ${COLORS.ink}; word-break: break-all;">${resultsUrl}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 8px 0 8px;">
              <p style="margin: 0; font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: 500; color: ${COLORS.textSecondary}; text-align: center;">Sent by Talkpush APAC because you took part in UAT testing for ${companyName}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildUatReviewedEmailText(input: UatReviewedEmailInput): string {
  const lines = [
    `Hi ${input.firstName},`,
    "",
    `We've reviewed the issues you reported for ${input.companyName}. Here's where they stand.`,
    "",
  ]

  if (input.message) {
    lines.push("A note from the Talkpush team:", input.message, "")
  }

  if (input.totalIssues === 0) {
    lines.push("You reported no issues. Nothing more is needed from you.", "")
  } else {
    lines.push(
      `Issues you reported: ${input.totalIssues}`,
      `Resolved: ${input.resolvedCount}`,
      `In progress: ${input.inProgressCount}`,
      `Pending review: ${input.pendingCount}`,
      ""
    )
  }

  lines.push(
    "View My Results:",
    input.resultsUrl,
    "",
    `Sent by Talkpush APAC because you took part in UAT testing for ${input.companyName}.`
  )

  return lines.join("\n")
}
