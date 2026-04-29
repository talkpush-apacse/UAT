# UAT Tool — URL Patterns

## Tester Registration (Entry Point)

- **Pattern:** `https://uat.se-talkpush.com/test/{slug}`
- **Auth required:** No (fully public)
- **Used for:** Tester lands here first. Shows the test scenario and a registration form (name, email, mobile). On submit, creates or retrieves a tester record and redirects to the checklist with `?tester={tester_id}`.

## Tester Checklist View

- **Pattern:** `https://uat.se-talkpush.com/test/{slug}/checklist?tester={tester_id}`
- **Auth required:** No (public, but `tester` query param is required)
- **Query params:** `tester` — UUID of the tester record (obtained after registration). Without it, the page redirects back to `/test/{slug}`.
- **Used for:** The main checklist interface where testers mark each step as Pass / Fail / N-A / Blocked, leave comments, and upload attachments.

## Tester Results View

- **Pattern:** `https://uat.se-talkpush.com/test/{slug}/results?tester={tester_id}`
- **Auth required:** No (public, but `tester` query param is required)
- **Query params:** `tester` — UUID of the tester record. Without it, redirects to `/test/{slug}`.
- **Used for:** Post-completion summary shown to the tester after they finish all steps. Displays their responses alongside any admin review notes.

## Admin — Project Dashboard

- **Pattern:** `https://uat.se-talkpush.com/admin/projects/{slug}`
- **Auth required:** Yes — admin session cookie (password login) **or** Supabase Auth with a `@talkpush.com` Google OAuth account. Unauthenticated requests redirect to `/admin/login`.
- **Used for:** Overview of a single project: checklist summary table, live tester progress, quick-action cards linking to all sub-pages, share-link buttons.

## Admin — Manage Checklist Steps

- **Pattern:** `https://uat.se-talkpush.com/admin/projects/{slug}/checklist`
- **Auth required:** Yes (admin)
- **Used for:** Add, edit, reorder, and delete checklist items; restore from a versioned snapshot.

## Admin — Review / Triage Findings

- **Pattern:** `https://uat.se-talkpush.com/admin/projects/{slug}/review`
- **Auth required:** Yes (admin)
- **Used for:** Admin triage view — classify each tester's Fail/Blocked response as a finding type (Bug, Training Gap, etc.) and set a resolution status.

## Admin — Edit Project Settings

- **Pattern:** `https://uat.se-talkpush.com/admin/projects/{slug}/edit`
- **Auth required:** Yes (admin)
- **Used for:** Edit project metadata: company name, title, test scenario, Talkpush login link, wizard mode toggle.

## Admin — Upload UAT Sheet

- **Pattern:** `https://uat.se-talkpush.com/admin/projects/{slug}/upload`
- **Auth required:** Yes (admin)
- **Used for:** Bulk-import checklist steps from a spreadsheet upload.

## Admin — Sign-Off

- **Pattern:** `https://uat.se-talkpush.com/admin/projects/{slug}/signoff`
- **Auth required:** Yes (admin)
- **Used for:** Record formal UAT sign-off entries (name + date).

## Admin — AI Summary

- **Pattern:** `https://uat.se-talkpush.com/admin/projects/{slug}/ai-summary`
- **Auth required:** Yes (admin)
- **Used for:** AI-generated narrative summary of the UAT results (requires `OPENAI_API_KEY`).

## Admin — Training Plan

- **Pattern:** `https://uat.se-talkpush.com/admin/projects/{slug}/training-plan`
- **Auth required:** Yes (admin)
- **Used for:** Training plan view derived from findings.

## Public / Client Analytics (Share Link)

- **Pattern:** `https://uat.se-talkpush.com/share/analytics/{slug}/{token}`
- **Auth required:** No login required, but the `token` segment must be a valid HMAC-SHA-256 share token for the slug (generated server-side via `generateShareToken(slug)`). An invalid token returns 404.
- **Used for:** Read-only analytics page for clients/stakeholders — charts, tester progress, pass/fail breakdown. Safe to share externally without exposing admin credentials.
- **How to get the token:** Admin visits `/admin/projects/{slug}` and clicks **Copy Analytics Link** (or the token is generated in code via `generateShareToken(slug)` using `SHARE_TOKEN_SECRET` / `ADMIN_SESSION_SECRET`). The token is deterministic for a given slug + secret, so the same link remains valid indefinitely (until the secret rotates).

---

## Example URLs

For project slug `alorica-ph-qm-smoke-test-scenario-1-walk-in`:

| Purpose | URL |
|---|---|
| Tester registration | `https://uat.se-talkpush.com/test/alorica-ph-qm-smoke-test-scenario-1-walk-in` |
| Tester checklist | `https://uat.se-talkpush.com/test/alorica-ph-qm-smoke-test-scenario-1-walk-in/checklist?tester={tester_uuid}` |
| Tester results | `https://uat.se-talkpush.com/test/alorica-ph-qm-smoke-test-scenario-1-walk-in/results?tester={tester_uuid}` |
| Admin dashboard | `https://uat.se-talkpush.com/admin/projects/alorica-ph-qm-smoke-test-scenario-1-walk-in` |
| Admin review | `https://uat.se-talkpush.com/admin/projects/alorica-ph-qm-smoke-test-scenario-1-walk-in/review` |
| Client analytics | `https://uat.se-talkpush.com/share/analytics/alorica-ph-qm-smoke-test-scenario-1-walk-in/{hmac_token}` |

> **Note on `{tester_uuid}`:** This is the UUID auto-assigned when a tester registers. It is passed as a query parameter — it is not part of the URL path. The registration form redirects the tester to the checklist URL with this param automatically.
>
> **Note on `{hmac_token}`:** A 64-character hex string (SHA-256 HMAC of the slug). It is deterministic — the same slug + server secret always produces the same token. Admins copy the full analytics URL from the project dashboard.
