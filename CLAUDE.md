# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (runs type-check + lint)
npm run lint     # ESLint via next lint
```

There are no automated tests. The project has no test runner configured.

## Environment Variables

Copy `.env.local.example` to `.env.local`:

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS) |
| `ADMIN_PASSWORD` | Yes | Plain-text password for the password-based admin login |
| `ADMIN_SESSION_SECRET` | Yes | 32-char random string for HMAC-signing session cookies |
| `NEXT_PUBLIC_APP_URL` | Yes | Public base URL (e.g. `https://uat.talkpush.com`) |
| `MCP_API_KEY` | Optional | API key protecting the `/api/mcp` endpoint |
| `SHARE_TOKEN_SECRET` | Optional | HMAC key for share tokens; falls back to `ADMIN_SESSION_SECRET` |
| `BREVO_API_KEY` | Optional | Brevo transactional email (notify testers feature) |
| `OPENAI_API_KEY` | Optional | OpenAI key for AI UAT summary generation |

## Architecture

### Stack

Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage), Radix UI / shadcn components, Zod validation, `mcp-handler` for the MCP server.

### User Roles & Route Layout

Three distinct user personas, each with their own section of the app:

- **Admin** — `/admin/*` — Protected by session cookie or Supabase Auth. Creates/edits projects and checklists, reviews tester findings, exports reports.
- **Tester** — `/test/[slug]` — Public page. Testers register per-project and complete the checklist.
- **Client/Public** — `/share/[slug]/analytics` — Read-only analytics page protected by a per-slug HMAC share token.

### Admin Authentication (dual-path)

`verifyAdminSession()` in `src/lib/utils/admin-auth.ts` checks two paths in order:

1. **Password cookie** — `admin_session` cookie containing `timestamp.HMAC_signature`. Set on successful password login against `ADMIN_PASSWORD`. 24-hour expiry.
2. **Supabase Auth session** — Falls back to checking `supabase.auth.getUser()` and accepting any `@talkpush.com` email (Google OAuth).

The admin login page (`/admin/login`) supports both paths.

### Three Supabase Clients

Always use the right client — mixing them causes subtle auth/RLS bugs:

| Factory | File | Used for |
|---|---|---|
| `createAdminClient()` | `src/lib/supabase/admin.ts` | Server Actions and MCP tools — uses service role key, **bypasses all RLS** |
| `createServerSupabaseClient()` | `src/lib/supabase/server.ts` | Auth callbacks and session verification — SSR client with cookie forwarding |
| `createAnonSupabaseClient()` | `src/lib/supabase/server.ts` | Tester-facing mutations (responses, tester registration) — anonymous, no session |

### Server Actions

All mutations go through Next.js Server Actions (`'use server'`) in `src/lib/actions/`. There are no internal API routes for state mutation — the only API routes are:

- `/api/mcp/[[...transport]]` — Remote MCP server (see below)
- `/api/projects/[slug]` — Public project data for the tester page
- `/api/upload-url` — Generates signed Supabase Storage URLs for file uploads
- `/api/delete-attachment` — Deletes an attachment from storage
- `/api/share-token/[slug]` — Generates/verifies HMAC share tokens for analytics links
- `/api/clients` — Client list for the project creation form

### Database Schema (key tables)

- **`projects`** — `slug` is the URL key. `wizard_mode` boolean toggles one-step-at-a-time testing UI.
- **`checklist_items`** — Has both `step_number` (display label) and `sort_order` (drag reorder). These diverge after reordering. Two Postgres RPCs manage renumbering: `renumber_steps` and `reorder_checklist_steps`.
- **`testers`** — Registered per-project by email. Returning testers are looked up by email.
- **`responses`** — Upserted on `(tester_id, checklist_item_id)`. Status values: `Pass`, `Fail`, `N-A`, `Blocked`.
- **`admin_reviews`** — One row per `(tester_id, checklist_item_id)`. `finding_type` (formerly `behavior_type`) and `resolution_status`. Changes are tracked in `admin_review_history`.
- **`checklist_snapshots`** — Versioned JSONB snapshots of a project's checklist, auto-created before bulk edits.
- **`clients`** — Simple client name registry (distinct from `company_name` on projects).

Migrations live in `supabase/migrations/` and are applied with the Supabase CLI.

### MCP Server

`/api/mcp/[[...transport]]` exposes a remote MCP endpoint powered by `mcp-handler`. All tools use `createAdminClient()` (service role). Authentication is via `x-api-key` header or `?api_key=` query param checked against `MCP_API_KEY`.

Registered tools: `search`, `fetch`, `list_projects`, `create_project`, `get_project`, `get_checklist`, `create_checklist_items`, `update_checklist_item`, `delete_checklist_items`, `reorder_checklist`, `get_project_progress`, `list_testers`, `get_admin_reviews`.

### Type Safety

`src/lib/types/database.ts` is the generated Supabase type file — regenerate it with `supabase gen types typescript` when the schema changes. All Supabase clients are typed with `createClient<Database>(...)`.

Zod schemas in `src/lib/schemas/` validate all form and server action inputs before they touch the database.
