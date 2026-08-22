-- Migration: 20260822170000_add_client_logo_and_project_link.sql
-- Rollback:
--   DELETE FROM storage.buckets WHERE id = 'client-logos';
--   DROP POLICY IF EXISTS "Anonymous users can read clients" ON clients;
--   DROP INDEX IF EXISTS idx_projects_client_id;
--   ALTER TABLE projects DROP COLUMN IF EXISTS client_id;
--   ALTER TABLE clients DROP COLUMN IF EXISTS logo_url;

-- Add a logo column to clients (public URL into the client-logos bucket)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Give projects a real link to clients instead of matching company_name text
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- Backfill existing projects by matching their company_name to a client name
UPDATE projects
SET client_id = clients.id
FROM clients
WHERE projects.company_name = clients.name
  AND projects.client_id IS NULL;

-- Tester pages read via the anon client and need the client's logo/name to
-- render branding on an otherwise-unauthenticated checklist page.
DROP POLICY IF EXISTS "Anonymous users can read clients" ON clients;
CREATE POLICY "Anonymous users can read clients"
  ON clients FOR SELECT
  TO anon
  USING (true);

-- Public bucket for client logo files. Only admins write to it (via the
-- service-role client, which bypasses RLS), so no anon write policy is
-- needed — public=true is enough for tester/report pages to read logos.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  true,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
