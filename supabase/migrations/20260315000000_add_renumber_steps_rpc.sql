-- Migration: 20260315000000_add_renumber_steps_rpc.sql
-- Rollback: DROP FUNCTION IF EXISTS renumber_steps(uuid);
--
-- Replaces the N×2 individual UPDATE calls in the application-layer
-- renumberSteps() helper with a single server-side RPC call.
-- Two passes are required to avoid UNIQUE(project_id, step_number) violations
-- during renumbering: first set all step_numbers to unique negative values,
-- then set them to the correct positive sequential values.

CREATE OR REPLACE FUNCTION renumber_steps(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Pass 1: set to unique negative values to avoid constraint collisions
  UPDATE checklist_items ci
  SET step_number = -(sub.rn)
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) AS rn
    FROM checklist_items
    WHERE project_id = p_project_id
  ) sub
  WHERE ci.id = sub.id
    AND ci.project_id = p_project_id;

  -- Pass 2: set to correct sequential positive values
  UPDATE checklist_items ci
  SET step_number = sub.rn
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) AS rn
    FROM checklist_items
    WHERE project_id = p_project_id
  ) sub
  WHERE ci.id = sub.id
    AND ci.project_id = p_project_id;
END;
$$;
