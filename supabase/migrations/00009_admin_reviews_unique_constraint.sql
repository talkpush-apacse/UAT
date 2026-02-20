-- Migration: 00009_admin_reviews_unique_constraint.sql
-- Rollback: ALTER TABLE admin_reviews DROP CONSTRAINT IF EXISTS admin_reviews_item_tester_unique;
--
-- The saveAdminReview server action uses an upsert with onConflict: 'checklist_item_id,tester_id'.
-- Supabase requires a UNIQUE constraint (not just an index) for upsert conflict resolution.
-- Without this, every save attempt fails with "there is no unique or exclusion constraint
-- matching the ON CONFLICT specification", producing the "Error saving" message in the UI.

ALTER TABLE admin_reviews
  ADD CONSTRAINT admin_reviews_item_tester_unique
  UNIQUE (checklist_item_id, tester_id);
