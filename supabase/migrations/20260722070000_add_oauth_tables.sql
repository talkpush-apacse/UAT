-- Migration: 20260722070000_add_oauth_tables.sql
-- Rollback: DROP TABLE IF EXISTS oauth_tokens; DROP TABLE IF EXISTS oauth_authorization_codes; DROP TABLE IF EXISTS oauth_clients;
--
-- Adds a minimal OAuth 2.1 + PKCE authorization server (RFC 7591 Dynamic Client
-- Registration, RFC 8414 Authorization Server Metadata, RFC 9728 Protected
-- Resource Metadata) so the MCP endpoint at /api/mcp can be added as a
-- claude.ai custom connector, which requires OAuth rather than a static
-- query-param API key.
--
-- These tables are only ever read/written via createAdminClient() (service
-- role) from server-only route handlers — never from browser/client code —
-- so RLS is enabled with no policies (default deny for anon/authenticated),
-- and grants are limited to service_role.

CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_name TEXT,
  redirect_uris TEXT[] NOT NULL,
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  code_challenge_method TEXT NOT NULL,
  resource TEXT,
  scope TEXT,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
  access_token_hash TEXT NOT NULL UNIQUE,
  refresh_token_hash TEXT UNIQUE,
  resource TEXT,
  scope TEXT,
  revoked BOOLEAN NOT NULL DEFAULT false,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  refresh_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_expires_at ON oauth_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_client_id ON oauth_authorization_codes(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_id ON oauth_tokens(client_id);
-- No explicit index on oauth_tokens.refresh_token_hash: the UNIQUE
-- constraint above already creates one; a second would just be redundant
-- write overhead.

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies are added intentionally: anon/authenticated get zero access
-- (default deny). service_role bypasses RLS and is the only reader/writer.

-- Required for new-project Data API reachability via the Supabase client
-- (service role). Not granted to anon/authenticated — these tables must
-- never be reachable from browser code.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE oauth_clients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE oauth_authorization_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE oauth_tokens TO service_role;
