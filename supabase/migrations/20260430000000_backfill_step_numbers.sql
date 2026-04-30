-- Migration: 20260430000000_backfill_step_numbers.sql
-- Rollback: N/A — renumber_steps is deterministic; re-running it is idempotent.
--
-- Context: Before 2026-04-30, the MCP reorder_checklist tool updated sort_order
-- via N parallel individual UPDATEs and never called renumber_steps afterward.
-- This left step_number stale on any project reordered through the MCP path.
-- The code bug is fixed in this same release; this migration repairs existing data.
--
-- Safe to re-run: renumber_steps is idempotent — calling it on an already-correct
-- project produces no change.

DO $$
DECLARE
  proj_id uuid;
BEGIN
  FOR proj_id IN
    SELECT DISTINCT id FROM projects
  LOOP
    PERFORM renumber_steps(proj_id);
  END LOOP;
END;
$$;
