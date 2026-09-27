-- Migration: 20260918090000_add_mcp_caller_identity.sql
-- Rollback:
--   ALTER TABLE mcp_tool_calls DROP COLUMN IF EXISTS caller;
--   ALTER TABLE oauth_tokens DROP COLUMN IF EXISTS admin_email;
--   ALTER TABLE oauth_authorization_codes DROP COLUMN IF EXISTS admin_email;
--
-- Lets the MCP Usage chart show WHO made each tool call, not just which
-- tool. Two identity sources:
--   - OAuth connectors (claude.ai "Add to Claude"): the admin who approves
--     the connector at /oauth/authorize is now recorded on the issued
--     authorization code and carried forward onto the token, so every call
--     made with that token can be traced back to the approving admin's
--     email (when they signed in via Google/Supabase Auth — password-login
--     admin sessions have no individual identity to record).
--   - Static MCP_API_KEY callers (shared secret — no way to distinguish
--     individual callers): tagged with the literal caller "Shared Key" at
--     write time, not with a new column.

ALTER TABLE oauth_authorization_codes ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE mcp_tool_calls ADD COLUMN IF NOT EXISTS caller TEXT;

CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_caller ON mcp_tool_calls(caller);
