# Review finding template

Use when reviewing Replit's implementation (phase 7) or checking readiness (phase 8). Review against the approved documents. Recommend corrections. Do not change code yourself.

## Rules

- Evidence is something you saw: shared code, a screenshot, a test result, a log excerpt. Quote or point to it exactly.
- If you could not check something, list it under "Not verified". Do not mark it as passed.
- One finding per problem. Keep each finding short.
- Do not call a system secure, anonymous, compliant, or ready beyond what the evidence supports.
- Do not automatically modify code. The user approves findings first, then Replit implements them.

## Finding format

**Finding ID:** F-001 (stable, never reused)
**Category:** one of: Security, Privacy and anonymity, Authorization, Audit logging, Data integrity, Retention and deletion, Functional (spec mismatch), UX and accessibility, Copy and legal text, Performance and reliability, Simplicity, Documentation
**Severity or priority:** Critical / High / Medium / Low (see scale below), plus Priority if the user uses one (Must fix before launch / Should fix / Could fix)
**Requirement affected:** REQ or acceptance criterion ID and a one-line statement. If none exists, write "No matching requirement" and say whether the spec needs updating.
**Evidence:** what was seen and where (file and line, screenshot, test output, request and response).
**Why it matters:** the concrete consequence for a reporter, an investigator, or the client. Name who is harmed or exposed and how.
**Recommended correction:** the smallest change that fixes it, in plain language. State the rule to enforce, not a full rewrite.
**Acceptance test:** how to prove it is fixed, as pass or fail. Include the negative case (the thing that must not be possible).

## Severity scale

| Severity | Use when |
|---|---|
| Critical | Reporter identity or report content can be exposed to someone who should not see it, or access control can be bypassed, or data can be lost or altered without detection |
| High | A confirmed security or privacy control is weakened, an approved requirement is missing in a way that affects safety, or audit logging misses a required event |
| Medium | A real defect with limited reach, or a gap that needs unusual conditions to matter |
| Low | Minor defects, clarity issues, small improvements |

If you cannot state the concrete harm, the severity is lower than it feels. If the harm depends on a fact you could not verify, say so and mark the finding "Needs validation" instead of assigning a high severity.

## Example

**Finding ID:** F-007
**Category:** Privacy and anonymity
**Severity:** High
**Requirement affected:** REQ-021 "Anonymous reports must not store the reporter's IP address."
**Evidence:** `submitReport` handler shared in message 4 passes `request.ip` into the audit log entry (lines 42 to 47).
**Why it matters:** Anyone with audit log access can link an anonymous report to a network address, which defeats the anonymous promise shown to reporters.
**Recommended correction:** Do not record network address for anonymous submissions. Record only event type, case code, and time. Check proxy and hosting logs for the same data and confirm they are covered by the approved anonymity analysis.
**Acceptance test:** Submit an anonymous report. Inspect the audit log, application log, and database rows: no IP address appears in any. Submit an identified report: the identity is stored only in the restricted identity record.

## Review summary (put at the top of every review)

| Item | Value |
|---|---|
| Milestone or scope reviewed | |
| Documents reviewed against (versions) | |
| Evidence received | |
| Result | Pass / Pass with conditions / Not passed |
| Critical / High / Medium / Low counts | |
| Not verified (list) | |
| Recommended next step | |

## Findings table (after the summary)

| ID | Category | Severity | Requirement | One-line summary | Status |
|---|---|---|---|---|---|
| F-001 | | | | | Open |

Status values: Open, Sent to Replit, Fixed (awaiting verification), Verified, Accepted risk (with approver and date), Needs validation.

## After fixes

When Replit reports a fix, re-check the acceptance test with fresh evidence. Move the finding to Verified only if the test passes. If the fix changes behavior described in the approved documents, update the documents and re-approve before closing.
