-- Migration: 20261009090000_add_project_notification_recipients.sql
-- Rollback: DROP TABLE IF EXISTS project_notification_recipients;

-- Staff who get an email when a tester submits a checklist. Kept in its own
-- table (not a column on projects) because projects is readable by the public
-- anon key, which would expose these addresses.
-- RLS is ON with intentionally NO policies: only the service role can read or
-- write this table.
CREATE TABLE IF NOT EXISTS project_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS project_notification_recipients_project_email_key
  ON project_notification_recipients (project_id, lower(email));

ALTER TABLE project_notification_recipients ENABLE ROW LEVEL SECURITY;
