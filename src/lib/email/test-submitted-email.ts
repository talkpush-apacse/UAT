import { COLORS, FONT, countRow, escapeHtml } from "@/lib/email/uat-reviewed-email"

/* ------------------------------------------------------------------ */
/*  "A tester has submitted their UAT results" email                   */
/*                                                                    */
/*  Sent to Talkpush staff on a checklist's notification list. Same   */
/*  Talkpush Sign look as the "results reviewed" email. Tester name   */
/*  and email are typed on a public form, so every one is escaped.    */
/*  The email never contains comments, screenshots or step text.      */
/* ------------------------------------------------------------------ */

export type TestSubmittedEmailInput = {
  testerName: string
  testerEmail: string
  checklistTitle: string
  companyName: string
  submittedOn: string
  stepsTested: number
  passed: number
  issues: number
  notApplicable: number
  reviewUrl: string
  editUrl: string
  logoUrl: string
}

const MAX_NAME_IN_SUBJECT = 60

// Testers type their own name, so strip line breaks and control characters
// (header injection) and keep the subject a sensible length.
function singleLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\s+/g, " ").trim()
}

export function buildTestSubmittedSubject(testerName: string, companyName: string): string {
  const name = singleLine(testerName)
  const shortName =
    name.length > MAX_NAME_IN_SUBJECT ? `${name.slice(0, MAX_NAME_IN_SUBJECT - 1)}…` : name
  return `${shortName || "A tester"} submitted UAT for ${singleLine(companyName)}`
}

function preheader(input: TestSubmittedEmailInput): string {
  return input.issues === 0
    ? `${singleLine(input.testerName)} reported no issues for ${singleLine(input.companyName)}.`
    : `${singleLine(input.testerName)} reported ${input.issues} ${input.issues === 1 ? "issue" : "issues"} for ${singleLine(input.companyName)}.`
}

const WRAP = "word-break: break-word; overflow-wrap: anywhere;"

export function buildTestSubmittedEmailHtml(input: TestSubmittedEmailInput): string {
  const testerName = escapeHtml(singleLine(input.testerName))
  const testerEmail = escapeHtml(singleLine(input.testerEmail))
  const checklistTitle = escapeHtml(singleLine(input.checklistTitle))
  const companyName = escapeHtml(singleLine(input.companyName))
  const submittedOn = escapeHtml(input.submittedOn)
  const reviewUrl = escapeHtml(input.reviewUrl)
  const editUrl = escapeHtml(input.editUrl)
  const logoUrl = escapeHtml(input.logoUrl)

  const detailRow = (label: string, value: string, isLast: boolean) => `
              <tr>
                <td valign="top" width="110" style="padding: 8px 12px 8px 0; ${isLast ? "" : `border-bottom: 1px solid ${COLORS.hairline};`} font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: 700; color: ${COLORS.textSecondary};">${label}</td>
                <td valign="top" style="padding: 8px 0; ${isLast ? "" : `border-bottom: 1px solid ${COLORS.hairline};`} font-family: ${FONT}; font-size: 16px; line-height: 24px; font-weight: 500; color: ${COLORS.ink}; ${WRAP}">${value}</td>
              </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>A tester has submitted their UAT results</title>
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
                  <td style="padding: 0 32px 16px 32px;">
                    <h1 style="margin: 0; font-family: ${FONT}; font-size: 24px; line-height: 32px; font-weight: 700; color: ${COLORS.ink};">A tester has submitted their UAT results</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout: fixed;">${detailRow("Tester", testerName, false)}${detailRow("Email", testerEmail, false)}${detailRow("Checklist", checklistTitle, false)}${detailRow("Submitted", submittedOn, true)}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td colspan="3" style="padding: 0 0 8px 0; border-bottom: 2px solid ${COLORS.ink};">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                            <td style="font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${COLORS.ink}; font-weight: 700;">Steps tested</td>
                            <td align="right" style="font-family: ${FONT}; font-size: 16px; line-height: 24px; color: ${COLORS.ink}; font-weight: 700;">${input.stepsTested}</td>
                          </tr></table>
                        </td>
                      </tr>${countRow("Passed", input.passed, COLORS.sage, false)}${countRow("Issues", input.issues, COLORS.amber, false)}${countRow("N/A", input.notApplicable, COLORS.lavender, true)}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 16px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="${COLORS.ink}" style="background-color: ${COLORS.ink}; border-radius: 9px;">
                          <a href="${reviewUrl}" style="display: block; padding: 14px 24px; font-family: ${FONT}; font-size: 16px; line-height: 20px; font-weight: 700; color: ${COLORS.inkCream}; text-decoration: none; border-radius: 9px;">Review findings</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 32px 32px 32px;">
                    <p style="margin: 0; font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: 500; color: ${COLORS.textSecondary};">Button not working? Copy this link into your browser:<br><a href="${reviewUrl}" style="color: ${COLORS.ink}; word-break: break-all;">${reviewUrl}</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 8px 0 8px;">
              <p style="margin: 0; font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: 500; color: ${COLORS.textSecondary}; text-align: center;">You're getting this because you're on the notification list for ${companyName} UAT. To change it, <a href="${editUrl}" style="color: ${COLORS.ink};">edit the checklist settings</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildTestSubmittedEmailText(input: TestSubmittedEmailInput): string {
  return [
    "A tester has submitted their UAT results",
    "",
    `Tester: ${singleLine(input.testerName)}`,
    `Email: ${singleLine(input.testerEmail)}`,
    `Checklist: ${singleLine(input.checklistTitle)}`,
    `Submitted: ${input.submittedOn}`,
    "",
    `Steps tested: ${input.stepsTested}`,
    `Passed: ${input.passed}`,
    `Issues: ${input.issues}`,
    `N/A: ${input.notApplicable}`,
    "",
    "Review findings:",
    input.reviewUrl,
    "",
    `You're getting this because you're on the notification list for ${singleLine(input.companyName)} UAT.`,
    `To change it, edit the checklist settings: ${input.editUrl}`,
  ].join("\n")
}
