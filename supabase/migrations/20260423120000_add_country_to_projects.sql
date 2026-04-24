-- Migration: 20260423120000_add_country_to_projects.sql
-- Rollback: ALTER TABLE projects DROP COLUMN IF EXISTS country;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'PH';

UPDATE projects SET country = 'PH' WHERE country IS NULL;
