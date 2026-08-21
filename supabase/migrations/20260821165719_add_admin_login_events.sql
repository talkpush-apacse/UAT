-- Migration: 20260821165719_add_admin_login_events.sql
-- Rollback: DROP TABLE IF EXISTS admin_login_events;

-- Logs one row per successful admin login (password or Google), for the
-- hidden, unauthenticated-by-design login tracker page. Written only by
-- loginAdmin() and auth/callback/route.ts via the service role client.
CREATE TABLE IF NOT EXISTS admin_login_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  method      TEXT        NOT NULL CHECK (method IN ('password', 'google')),
  email       TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_events_created_at ON admin_login_events(created_at);

-- RLS: enable — no anon/authenticated policy added; only the service role
-- (bypasses RLS) writes and reads this table, same pattern as
-- checklist_snapshots and mcp_tool_calls.
ALTER TABLE admin_login_events ENABLE ROW LEVEL SECURITY;

-- Required for new projects (post-May 30, 2026) for the Supabase client to reach this table.
-- Safe no-op on older projects if grants already exist. No anon grant — service-role access only.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE admin_login_events TO authenticated;
