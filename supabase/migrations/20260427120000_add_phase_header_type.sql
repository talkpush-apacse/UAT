-- Migration: 20260427120000_add_phase_header_type.sql
-- Rollback:
--   DROP TRIGGER IF EXISTS admin_reviews_reject_header ON admin_reviews;
--   DROP TRIGGER IF EXISTS responses_reject_header ON responses;
--   DROP FUNCTION IF EXISTS reject_response_for_header();
--   DROP INDEX IF EXISTS checklist_items_project_step_number_step_only_uidx;
--   ALTER TABLE checklist_items
--     ADD CONSTRAINT checklist_items_project_id_step_number_key UNIQUE (project_id, step_number);
--   ALTER TABLE checklist_items ALTER COLUMN step_number SET NOT NULL;
--   ALTER TABLE checklist_items DROP COLUMN IF EXISTS header_label;
--   ALTER TABLE checklist_items DROP COLUMN IF EXISTS item_type;
--   -- And restore the previous renumber_steps / reorder_checklist_steps function bodies
--   -- from migrations 20260315000000_* and 20260315000001_*.

-- Adds a Phase Header item type for checklist_items. Phase headers are
-- visual section dividers and must never receive a tester response or admin
-- review. Defense in depth: CHECK constraint on item_type, partial unique
-- index on step_number, and BEFORE triggers on responses/admin_reviews.

-- ============================================
-- 1. New columns on checklist_items
-- ============================================

ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'step'
    CHECK (item_type IN ('step', 'phase_header'));

ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS header_label TEXT;

-- ============================================
-- 2. Make step_number nullable + replace UNIQUE with partial unique index
--    Phase headers store step_number = NULL; only 'step' rows must be unique.
-- ============================================

ALTER TABLE checklist_items
  ALTER COLUMN step_number DROP NOT NULL;

ALTER TABLE checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_project_id_step_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS checklist_items_project_step_number_step_only_uidx
  ON checklist_items (project_id, step_number)
  WHERE item_type = 'step';

-- ============================================
-- 3. Replace renumber_steps RPC: only renumbers item_type = 'step' rows;
--    sets step_number = NULL for phase headers.
-- ============================================

CREATE OR REPLACE FUNCTION renumber_steps(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Phase headers never have a step_number
  UPDATE checklist_items
  SET step_number = NULL
  WHERE project_id = p_project_id
    AND item_type = 'phase_header'
    AND step_number IS NOT NULL;

  -- Pass 1: temporary unique negative values (avoid partial-unique-index
  -- collisions during the renumber)
  UPDATE checklist_items ci
  SET step_number = -(sub.rn)
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) AS rn
    FROM checklist_items
    WHERE project_id = p_project_id
      AND item_type = 'step'
  ) sub
  WHERE ci.id = sub.id
    AND ci.project_id = p_project_id;

  -- Pass 2: final sequential positive values, steps only
  UPDATE checklist_items ci
  SET step_number = sub.rn
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) AS rn
    FROM checklist_items
    WHERE project_id = p_project_id
      AND item_type = 'step'
  ) sub
  WHERE ci.id = sub.id
    AND ci.project_id = p_project_id;
END;
$$;

-- ============================================
-- 4. Replace reorder_checklist_steps RPC: bulk sort_order update + step-only renumber
-- ============================================

CREATE OR REPLACE FUNCTION reorder_checklist_steps(p_project_id uuid, p_items jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update sort_order for every item in the provided list (steps + headers)
  UPDATE checklist_items ci
  SET sort_order = (item->>'sort_order')::integer
  FROM jsonb_array_elements(p_items) AS item
  WHERE ci.id = (item->>'id')::uuid
    AND ci.project_id = p_project_id;

  -- Phase headers never have a step_number
  UPDATE checklist_items
  SET step_number = NULL
  WHERE project_id = p_project_id
    AND item_type = 'phase_header'
    AND step_number IS NOT NULL;

  -- Pass 1: temporary negative values for steps
  UPDATE checklist_items ci
  SET step_number = -(sub.rn)
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) AS rn
    FROM checklist_items
    WHERE project_id = p_project_id
      AND item_type = 'step'
  ) sub
  WHERE ci.id = sub.id
    AND ci.project_id = p_project_id;

  -- Pass 2: final positive values for steps
  UPDATE checklist_items ci
  SET step_number = sub.rn
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order) AS rn
    FROM checklist_items
    WHERE project_id = p_project_id
      AND item_type = 'step'
  ) sub
  WHERE ci.id = sub.id
    AND ci.project_id = p_project_id;
END;
$$;

-- ============================================
-- 5. Triggers: reject responses / admin_reviews against phase_header items
-- ============================================

CREATE OR REPLACE FUNCTION reject_response_for_header()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_type TEXT;
BEGIN
  SELECT item_type INTO v_item_type
  FROM checklist_items
  WHERE id = NEW.checklist_item_id;

  IF v_item_type = 'phase_header' THEN
    RAISE EXCEPTION 'Cannot create a response or admin review for a phase_header checklist item (id=%)', NEW.checklist_item_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS responses_reject_header ON responses;
CREATE TRIGGER responses_reject_header
  BEFORE INSERT OR UPDATE OF checklist_item_id ON responses
  FOR EACH ROW
  EXECUTE FUNCTION reject_response_for_header();

DROP TRIGGER IF EXISTS admin_reviews_reject_header ON admin_reviews;
CREATE TRIGGER admin_reviews_reject_header
  BEFORE INSERT OR UPDATE OF checklist_item_id ON admin_reviews
  FOR EACH ROW
  EXECUTE FUNCTION reject_response_for_header();
