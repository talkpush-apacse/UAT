-- Migration: 20260821163806_add_mcp_tool_calls.sql
-- Rollback: DROP TABLE IF EXISTS mcp_tool_calls;

-- Logs one row per MCP tool invocation (/api/mcp), for the admin-only
-- MCP usage chart. Written only by the MCP route via the service role client.
CREATE TABLE IF NOT EXISTS mcp_tool_calls (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name   TEXT        NOT NULL,
  success     BOOLEAN     NOT NULL,
  duration_ms INTEGER     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_created_at ON mcp_tool_calls(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_tool_name ON mcp_tool_calls(tool_name);

-- RLS: enable — no anon/authenticated policy added; only the service role
-- (bypasses RLS) writes and reads this table, same pattern as checklist_snapshots.
ALTER TABLE mcp_tool_calls ENABLE ROW LEVEL SECURITY;

-- Required for new projects (post-May 30, 2026) for the Supabase client to reach this table.
-- Safe no-op on older projects if grants already exist. No anon grant — admin-only, service-role access.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE mcp_tool_calls TO authenticated;
