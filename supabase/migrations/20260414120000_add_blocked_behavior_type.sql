-- Migration: 20260414120000_add_blocked_behavior_type.sql
-- Rollback: ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_behavior_type_check;
--           ALTER TABLE admin_reviews ADD CONSTRAINT admin_reviews_behavior_type_check
--             CHECK (behavior_type IS NULL OR behavior_type IN (
--               'Expected Behavior', 'Bug/Glitch', 'Configuration Issue', 'For Retesting'
--             ));

ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_behavior_type_check;

ALTER TABLE admin_reviews ADD CONSTRAINT admin_reviews_behavior_type_check
  CHECK (behavior_type IS NULL OR behavior_type IN (
    'Expected Behavior',
    'Bug/Glitch',
    'Configuration Issue',
    'For Retesting',
    'Blocked'
  ));
