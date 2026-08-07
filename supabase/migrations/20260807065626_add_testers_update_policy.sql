-- Migration: 20260807065626_add_testers_update_policy.sql
-- Rollback: DROP POLICY IF EXISTS "Public can update testers" ON testers;

-- testers had anon INSERT and SELECT policies but no UPDATE policy, so
-- markTestComplete's update to test_completed has always silently no-op'd
-- under RLS (0 rows affected, no error surfaced). This mirrors the existing
-- "Public can update responses" policy pattern.
-- Postgres has no "CREATE POLICY IF NOT EXISTS" — drop-then-create for idempotency.
DROP POLICY IF EXISTS "Public can update testers" ON testers;
CREATE POLICY "Public can update testers"
  ON testers FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
