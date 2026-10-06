# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Testers (primary for the public pages).** Client HR and recruiting staff at companies Talkpush is implementing for. They are non-technical, work through steps on a laptop and sometimes a phone, and often have to switch between this page and the Talkpush recruiter CRM or a phone call. They arrive from a link, register with an email, and return to the same link later.

**Admins.** Talkpush solutions engineers and colleagues (Google sign-in with a `@talkpush.com` address, or the shared admin password). They write checklists, review what testers reported, resolve findings and export reports.

**Clients and stakeholders (read-only).** People who see a per-project analytics page through a signed share link.

## Product Purpose

An internal Talkpush web app for running User Acceptance Testing on a client's configuration before go-live. An admin builds a checklist of steps (what to do, who does it, a tip, an optional reference sample). Testers answer each step Pass, Fail, N/A, Blocked or Up For Review, with comments and screenshots where something is wrong. Admins review each finding, mark its resolution, and use the result to get client sign-off.

Success for a session: every step answered with enough evidence that Talkpush can resolve failures and the client can sign off before go-live.

## Positioning

Replaces UAT run through spreadsheets and email threads. Each tester has their own saved progress, evidence travels with the answer, and admins track every finding to resolution. Checklists can also be created and managed through an MCP server, so they can be drafted from an AI assistant.

## Operating Context

- Testers use the real Talkpush CRM and live call or message flows while testing, so the page is read mid-task and in short glances.
- A checklist belongs to one project, identified by a URL slug. Projects can run in a one-step-at-a-time "wizard" mode or the full list. Anyone can preview the steps before registering.
- Progress saves automatically and a tester can leave and return via the same link.
- Testers submit when finished and can then see their results page with each issue's resolution state.
- Hosted on Vercel with Supabase for data and file storage. Analytics run through Mixpanel.

## Capabilities and Constraints

- Admin area: projects, checklists (steps, section headers, drag reorder, versioned snapshots), tester review, resolution tracking, exports, "notify testers" email, an optional AI-written UAT summary, a client registry, MCP usage and a what's-new log.
- Step statuses are fixed: Pass, Fail, N/A, Blocked, Up For Review. Fail, Blocked and Up For Review require a comment or screenshot before submitting.
- Attachments: images, PDF and Word files up to 10MB.
- Public URLs, slugs, share tokens and the stored status values are contracts and must not change without approval. Mixpanel click tracking reads button labels, so renaming buttons changes analytics.
- Admin and tester pages share UI primitives, so tester-specific styling stays in tester components.
- The repo also contains About and training-plan sections that this record does not cover.

## Brand Commitments

- Talkpush brand, following the Talkpush Sign design system v1.0 (warm near-white page, near-black ink, four brand pastels: sage, lavender, pink, amber; DM Sans for text and Space Grotesk for navigation).
- Tester pages carry a lasting commitment to a heavier, high-contrast look: 2px dark borders, no shadows, bold labels and medium-weight body text. Admin pages are separate and keep their existing style.
- Voice: plain and direct, written for non-technical testers. Button labels used by analytics stay stable.

## Evidence on Hand

- Live projects exist for clients including Inspiro, TaskUs and Concentrix.
- The analytics event catalogue is in `docs/analytics-events.md`; the schema is in `supabase/migrations/`.
- No tester testimonials, benchmarks or completion-rate claims are recorded here and none should be invented.

## Product Principles

1. **The tester's attention belongs to the task.** Instructions, the answer buttons and evidence come first; everything else is quiet.
2. **Evidence is part of the answer.** A failure without a comment or screenshot is not finished, and the interface says so plainly.
3. **Never lose a tester's work.** Saving is automatic, failures are visible and retryable, and returning to the same link resumes where they left off.
4. **Every piece of content must fit.** Checklists are written by many admins with long links and text, so layouts must survive whatever they paste.
5. **Close the loop.** Testers can see what happened to the issues they raised.

## Accessibility & Inclusion

- Text should meet at least WCAG AA contrast (4.5:1 for body text); light-gray text on white has been a past problem.
- Controls must work by touch (at least 44px tall) and by keyboard.
- Testers read in English, often as a second language, so copy stays short and literal.
