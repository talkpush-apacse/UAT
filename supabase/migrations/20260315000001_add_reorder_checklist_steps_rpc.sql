-- Migration: 20260315000001_add_reorder_checklist_steps_rpc.sql
-- Rollback: DROP FUNCTION IF EXISTS reorder_checklist_steps(uuid, jsonb);

-- Replaces N parallel sort_order UPDATEs + 2-pass renumber with a single DB round-trip.
-- Accepts a project_id and a JSON array of {id, sort_order} objects,
-- updates sort_order for all of them, then renumbers step_numbers sequentially.

CREATE OR REPLACE FUNCTION reorder_checklist_steps(p_project_id uuid, p_items jsonb)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- Update sort_order for each item in the provided list
  UPDATE checklist_items ci
  SET sort_order = (item->>'sort_order')::integer
  FROM jsonb_array_elements(p_items) AS item
  WHERE ci.id = (item->>'id')::uuid
    AND ci.project_id = p_project_id;

  -- Pass 1: set step_number to unique negative values to avoid UNIQUE constraint
  -- collisions while the renumber is in progress
  UPDATE checklist_items ci
  SET step_number = -(sub.rn)
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) AS rn
    FROM checklist_items
    WHERE project_id = p_project_id
  ) sub
  WHERE ci.id = sub.id AND ci.project_id = p_project_id;

  -- Pass 2: set step_number to final sequential positive values
  UPDATE checklist_items ci
  SET step_number = sub.rn
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) AS rn
    FROM checklist_items
    WHERE project_id = p_project_id
  ) sub
  WHERE ci.id = sub.id AND ci.project_id = p_project_id;
END;
$$;
