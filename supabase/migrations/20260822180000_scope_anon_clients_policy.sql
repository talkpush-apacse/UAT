-- Migration: 20260822180000_scope_anon_clients_policy.sql
-- Rollback:
--   DROP POLICY IF EXISTS "Anonymous users can read clients" ON clients;
--   CREATE POLICY "Anonymous users can read clients" ON clients FOR SELECT TO anon USING (true);

-- Narrow anon read access on clients: previously any anon caller with the
-- public API key could read the full client roster. Scope it to only
-- clients actually linked to a project, which is all the tester-facing
-- checklist page (the only anon consumer) ever needs.
DROP POLICY IF EXISTS "Anonymous users can read clients" ON clients;
CREATE POLICY "Anonymous users can read clients"
  ON clients FOR SELECT
  TO anon
  USING (
    id IN (SELECT client_id FROM projects WHERE client_id IS NOT NULL)
  );
