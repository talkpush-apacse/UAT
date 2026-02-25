-- Migration: 20260226120000_add_project_title.sql
-- Rollback: ALTER TABLE projects DROP COLUMN IF EXISTS title;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS title TEXT;
