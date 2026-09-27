-- Migration: 20260921000629_add_tester_source.sql
-- Rollback: ALTER TABLE testers DROP COLUMN IF EXISTS source;
--           ALTER TABLE testers DROP COLUMN IF EXISTS created_via;
--           DROP INDEX IF EXISTS idx_testers_source;

-- Lets an MCP-connected AI agent register itself as a tester
-- (register_uat_tester tool) and be told apart from a human who signed up
-- through the public /test/{slug} form. A human can only ever reach that
-- form, never the MCP tools, so any tester created via MCP is by
-- definition not human — the tool sets source='agent' itself; it is never
-- a caller-supplied flag.
--
--   source       — 'human' (default, existing rows keep this) or 'agent'.
--   created_via  — which credential registered the tester: an admin's
--                  email (OAuth connector) or the literal "Shared Key"
--                  (MCP_API_KEY caller), mirroring mcp_tool_calls.caller
--                  from 20260918090000_add_mcp_caller_identity.sql. NULL
--                  for human testers, who never go through MCP auth.

ALTER TABLE testers ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'human';
ALTER TABLE testers ADD COLUMN IF NOT EXISTS created_via TEXT;

ALTER TABLE testers DROP CONSTRAINT IF EXISTS testers_source_check;
ALTER TABLE testers ADD CONSTRAINT testers_source_check
  CHECK (source IN ('human', 'agent'));

CREATE INDEX IF NOT EXISTS idx_testers_source ON testers(source);
