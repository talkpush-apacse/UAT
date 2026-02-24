-- Migration: 00011_add_review_history.sql
-- Rollback: DROP TABLE IF EXISTS admin_review_history;
--
-- Adds an audit trail table for admin review changes.
-- Each row captures one field change (behavior_type, resolution_status, or notes).

CREATE TABLE IF NOT EXISTS admin_review_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  tester_id UUID NOT NULL REFERENCES testers(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups per step+tester
CREATE INDEX IF NOT EXISTS idx_review_history_item_tester
  ON admin_review_history(checklist_item_id, tester_id);

-- RLS: only accessible via service role (admin server actions)
ALTER TABLE admin_review_history ENABLE ROW LEVEL SECURITY;
