-- Migration: 20260415100000_add_up_for_review_status.sql
-- Rollback: ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_status_check;
--           ALTER TABLE responses ADD CONSTRAINT responses_status_check
--             CHECK (status IN ('Pass', 'Fail', 'N/A', 'Blocked'));

-- The existing check constraint on responses.status only allows four values:
--   Pass, Fail, N/A, Blocked
-- The tester UI is adding a distinct "Up For Review" status (separate from "Blocked").
-- "Blocked" = tester cannot test this step because a previous step failed.
-- "Up For Review" = tester is unsure whether this is a pass or fail; flagged for admin review.
-- This migration drops and recreates the constraint to allow the fifth value.

ALTER TABLE responses DROP CONSTRAINT IF EXISTS responses_status_check;

ALTER TABLE responses ADD CONSTRAINT responses_status_check
  CHECK (status IN ('Pass', 'Fail', 'N/A', 'Blocked', 'Up For Review'));
