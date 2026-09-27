ALTER TABLE projects
ADD COLUMN archived_at TIMESTAMPTZ;

CREATE INDEX projects_active_created_at_idx
ON projects (created_at DESC)
WHERE archived_at IS NULL;
