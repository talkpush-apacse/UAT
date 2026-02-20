-- Migration: 00010_fix_behavior_type_check.sql
-- Rollback: ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_behavior_type_check;
--           ALTER TABLE admin_reviews ADD CONSTRAINT admin_reviews_behavior_type_check
--             CHECK (behavior_type IN ('Expected Behavior', 'Bug/Glitch', 'Configuration Issue'));
--
-- The existing check constraint on behavior_type only allows three values:
--   Expected Behavior, Bug/Glitch, Configuration Issue
-- The review panel also uses "For Retesting" as a fourth option, but that value
-- is rejected by the constraint, producing "Error saving" in the UI.
-- This migration drops and recreates the constraint with all four allowed values.

ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_behavior_type_check;

ALTER TABLE admin_reviews ADD CONSTRAINT admin_reviews_behavior_type_check
  CHECK (behavior_type IS NULL OR behavior_type IN (
    'Expected Behavior',
    'Bug/Glitch',
    'Configuration Issue',
    'For Retesting'
  ));
