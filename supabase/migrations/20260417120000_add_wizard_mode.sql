-- Migration: 20260417120000_add_wizard_mode.sql
-- Rollback: ALTER TABLE projects DROP COLUMN IF EXISTS wizard_mode;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS wizard_mode BOOLEAN NOT NULL DEFAULT false;
