# Security and privacy checklist: Employee Hotline

Use in phase 5 (design review), phase 7 (implementation review), and phase 8 (production readiness).

For each item record: **Met / Gap / Not applicable / Unknown**, plus the **evidence** (where you saw it) or the **question** to resolve. Unknown is not a pass. This checklist supports a review. It is not a certification and does not replace a professional security assessment or legal advice.

## 1. Reporting modes

- [ ] The spec defines exactly what "anonymous" means in this product and what "confidential" means.
- [ ] The product never uses the word "anonymous" for a path where the reporter can be identified.
- [ ] Reporter-facing text about anonymity and confidentiality is approved by the client owner.
- [ ] If the reporter must be contactable (follow-up), the mechanism does not reveal identity (for example a case code and a message thread) and its limits are disclosed.

## 2. Anonymity threats (check every one for anonymous reports)

| Possible identifier | Question | Result |
|---|---|---|
| IP address | Is it logged by the app, database, reverse proxy, CDN, WAF, load balancer, or hosting platform? For how long? Who can read it? | |
| Reverse proxy and CDN logs | Can access logs be switched off or stripped for reporting routes? | |
| Analytics and tracking | Are any analytics, session replay, error trackers, or tag managers loaded on reporting pages? | |
| Cookies | Which cookies are set on reporting pages? Do any persist or identify a person? | |
| Authentication | Does the reporter log in with corporate identity (SSO) before reporting? If yes, can the report be linked to that account? | |
| Session identifiers | Are session IDs stored with the report or in logs? | |
| Browser and device identifiers | Are user agent, device ID, fingerprinting, or screen data captured? | |
| Uploaded-file metadata | Are EXIF, document author, software, GPS, and revision data removed or at least disclosed? | |
| Application logs | Do logs contain report text, names, IPs, tokens, or request bodies? | |
| Notification systems | Do emails, SMS, or push messages go to the reporter, include report content, or pass through a provider that sees it? | |
| Timing and content | Could small teams, writing style, or details in the report identify the reporter? Is this disclosed to the reporter? | |

For each Gap: remove it, redesign, or disclose the limit in approved reporter-facing text. Record who decided.

## 3. Authentication and sessions

- [ ] Staff (investigators, case managers, administrators) authenticate with a strong method (client-approved, for example SSO with multi-factor).
- [ ] No shared accounts. No default or hardcoded credentials.
- [ ] Session lifetime, idle timeout, and logout behavior are defined.
- [ ] Session cookies are protected against script access and sent only over secure connections.
- [ ] Password reset and account recovery cannot be used to take over staff accounts.
- [ ] Rate limiting or lockout exists on login and on case-lookup (case code) endpoints.
- [ ] Case codes given to anonymous reporters are long and unguessable.

## 4. Authorization and access

- [ ] Roles are defined and match the spec (reporter, intake, investigator, case manager, administrator, auditor).
- [ ] Access is checked on the server for every request, not only hidden in the UI.
- [ ] Case-level access: a user sees only cases assigned or granted to them.
- [ ] Investigator scope is limited to their assigned cases and the fields they need.
- [ ] Administrator privileges are limited. An administrator can manage the system without automatically reading case content or reporter identity, unless the spec says so.
- [ ] Reporter identity (for confidential reports) is visible only to named roles, and each view is logged.
- [ ] Conflict of interest: a person named in a case cannot access or administer it.
- [ ] Cross-tenant isolation, if multi-tenant: one tenant cannot read, list, or infer another tenant's data.
- [ ] Business-unit isolation, if applicable: scoped access works for lists, search, exports, and attachments.
- [ ] Direct object references (IDs in URLs or APIs) cannot be changed to reach another case.

## 5. Evidence and file uploads

- [ ] Allowed file types and sizes are defined.
- [ ] Files are scanned for malware before anyone can open them, or the risk is accepted and recorded.
- [ ] Files are stored outside the web root, with access checked per case.
- [ ] File names are not trusted (no path traversal, no execution).
- [ ] Metadata handling is defined (see anonymity table).
- [ ] Downloads are served with safe headers so they cannot run in the browser.
- [ ] Files are included in retention and deletion rules and in backups.

## 6. Case content and investigator notes

- [ ] Private investigator notes are separate from reporter-visible content and cannot be returned by any reporter-facing endpoint.
- [ ] Reporter-facing messages show only what the reporter is meant to see.
- [ ] Search and exports respect case-level access.
- [ ] Exports (CSV, PDF, reports) are access-controlled, logged, and do not expose identity or notes unless approved.

## 7. API exposure

- [ ] Every endpoint is listed, with the role allowed to call it.
- [ ] No endpoint returns more fields than the caller needs.
- [ ] Input is validated on the server. Errors do not leak internals.
- [ ] Public endpoints (report submission, status lookup) are protected against abuse and enumeration.
- [ ] Cross-origin settings are as narrow as possible.
- [ ] Admin and debug endpoints are not exposed to the public.

## 8. Audit logs

- [ ] Logged events include: sign-in and failures, case created, viewed, edited, assigned, status changed, reporter identity viewed, notes added, files uploaded and downloaded, exports, role and permission changes, deletions.
- [ ] Each entry records who, what, when, and which case, without storing report content.
- [ ] Integrity: logs cannot be edited or deleted by the people they record, including administrators, or tampering is detectable. State which.
- [ ] Logs are retained for a period approved by the client.
- [ ] Audit logs do not weaken anonymity (for example by storing IP addresses of anonymous reporters).
- [ ] Someone reviews the logs on a defined schedule.

## 9. Secrets and configuration

- [ ] No secrets in the code, repository, client-side code, or logs.
- [ ] Secrets are kept in the platform's secret store and rotated on a schedule and after any exposure.
- [ ] Separate secrets for development, testing, and production.
- [ ] Least-privilege credentials for the database and third-party services.

## 10. Notifications

- [ ] Each notification type is listed with recipient, channel, and content.
- [ ] Emails and messages never include report details or identity, only a neutral prompt to sign in.
- [ ] The notification provider's access to content and recipient data is understood and approved.
- [ ] Notifications cannot be used to confirm to a third party that a report exists.

## 11. Logging, monitoring, analytics

- [ ] Application and error logs exclude report content, names, tokens, and identifiers listed in section 2.
- [ ] Monitoring alerts do not include sensitive content.
- [ ] No third-party analytics, tracking pixels, or session replay on reporting or case pages unless explicitly approved and assessed.
- [ ] Reporting and statistics use aggregates and avoid small groups that can identify people.

## 12. Data retention and deletion

- [ ] Retention periods per data type are confirmed by the client (reports, files, notes, audit logs, backups).
- [ ] Deletion actually removes data from the database, file storage, search indexes, caches, and backups within a stated period.
- [ ] Legal hold, if needed, is defined.
- [ ] Reporter-facing text about retention matches what the system does.

## 13. Platform and delivery

- [ ] Data stays in the regions the client approved.
- [ ] Transport encryption is enforced. Data at rest is encrypted.
- [ ] Backups are protected, tested, and covered by deletion rules.
- [ ] Dependencies are listed, kept to what is needed, and checked for known vulnerabilities.
- [ ] Production and test data are separate. Real reports are never used for testing.
- [ ] An incident plan exists, including a suspected exposure of reporter identity.

## 14. Verdicts

| Verdict | Meaning |
|---|---|
| Ready | No open critical or high items. Unknowns are low impact and recorded. |
| Ready with conditions | Open items have an approved exception, an owner, and a date. |
| Not ready | Any critical or high item open, or an Unknown on a critical item. |

State the verdict with the scope of what was actually reviewed (design only, one milestone, or the full system) and what was not verified.
