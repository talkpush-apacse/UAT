-- Migration: 20260414150000_rename_behavior_type_to_finding_type.sql
-- Rollback:
--   ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_finding_type_check;
--   DO $$ BEGIN
--     IF EXISTS (SELECT 1 FROM information_schema.columns
--                WHERE table_name='admin_reviews' AND column_name='finding_type') THEN
--       ALTER TABLE admin_reviews RENAME COLUMN finding_type TO behavior_type;
--     END IF;
--   END $$;
--   ALTER TABLE admin_reviews ADD CONSTRAINT admin_reviews_behavior_type_check
--     CHECK (behavior_type IS NULL OR behavior_type IN (
--       'Expected Behavior', 'Bug/Glitch', 'Configuration Issue', 'For Retesting', 'Blocked'
--     ));
--   UPDATE admin_reviews
--     SET behavior_type = 'For Retesting', resolution_status = 'Not Yet Started'
--     WHERE behavior_type IS NULL AND resolution_status = 'For Retesting';

-- ── Step 1: Drop all old constraints (fully idempotent) ───────────────────────

ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_behavior_type_check;
ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_resolution_status_check;
ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_finding_type_check;

-- ── Step 2: Rename behavior_type → finding_type (idempotent) ─────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_reviews' AND column_name = 'behavior_type'
  ) THEN
    ALTER TABLE admin_reviews RENAME COLUMN behavior_type TO finding_type;
  END IF;
END $$;

-- ── Step 3: Data migration — move "For Retesting" rows (idempotent) ───────────
-- Any row where the old behavior_type was 'For Retesting' never had a real
-- finding type — the admin was signaling the step needs another test pass.
-- Move the signal to resolution_status and clear finding_type.

UPDATE admin_reviews
  SET finding_type = NULL,
      resolution_status = 'For Retesting'
  WHERE finding_type = 'For Retesting';

-- ── Step 4: Add new check constraint for finding_type ────────────────────────

ALTER TABLE admin_reviews ADD CONSTRAINT admin_reviews_finding_type_check
  CHECK (finding_type IS NULL OR finding_type IN (
    'Expected Behavior',
    'Bug/Glitch',
    'Configuration Issue',
    'User Error',
    'Blocked'
  ));
