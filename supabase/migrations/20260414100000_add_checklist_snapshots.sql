-- Migration: 20260414100000_add_checklist_snapshots.sql
-- Rollback: DROP TABLE IF EXISTS checklist_snapshots;

CREATE TABLE IF NOT EXISTS checklist_snapshots (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER    NOT NULL,
  label         TEXT        NOT NULL,
  item_count    INTEGER     NOT NULL DEFAULT 0,
  snapshot_data JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, version_number)
);

-- Index: list snapshots by project, newest first
CREATE INDEX IF NOT EXISTS idx_checklist_snapshots_project
  ON checklist_snapshots(project_id, version_number DESC);

-- RLS: enable — no anon policy added; admin uses service role (bypasses RLS)
ALTER TABLE checklist_snapshots ENABLE ROW LEVEL SECURITY;
