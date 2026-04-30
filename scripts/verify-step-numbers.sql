-- verify-step-numbers.sql
-- Manual test script for the step_number invariant.
-- Run in the Supabase SQL Editor to:
--   1. Verify the repro project is now correct after backfill.
--   2. Verify the invariant holds across all projects.
--   3. Exercise create / reorder / delete / item_type-change scenarios.
--
-- All assertions use RAISE EXCEPTION so a failure is loud and obvious.
-- Run in a transaction so the test data is always rolled back:
--   BEGIN; <run script> ROLLBACK;

-- ============================================================
-- SECTION 1: Verify the repro project (pre-backfill check)
-- ============================================================
-- After the backfill migration runs, every step in
-- alorica-ph-qm-smoke-test-scenario-2-existing-candidate should have a
-- step_number equal to its 1-indexed rank among steps ordered by sort_order,
-- and every phase_header should have step_number = NULL.

DO $$
DECLARE
  v_project_id uuid;
  v_wrong      int;
  v_headers    int;
BEGIN
  SELECT id INTO v_project_id
  FROM projects
  WHERE slug = 'alorica-ph-qm-smoke-test-scenario-2-existing-candidate';

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'Repro project not found — skipping Section 1';
    RETURN;
  END IF;

  -- Count steps with wrong step_number
  SELECT COUNT(*) INTO v_wrong
  FROM (
    SELECT
      step_number,
      ROW_NUMBER() OVER (ORDER BY sort_order)::int AS expected
    FROM checklist_items
    WHERE project_id = v_project_id AND item_type = 'step'
  ) t
  WHERE step_number IS DISTINCT FROM expected;

  IF v_wrong > 0 THEN
    RAISE EXCEPTION 'FAIL: repro project has % step(s) with wrong step_number', v_wrong;
  END IF;

  -- Count phase_headers with non-NULL step_number
  SELECT COUNT(*) INTO v_headers
  FROM checklist_items
  WHERE project_id = v_project_id
    AND item_type = 'phase_header'
    AND step_number IS NOT NULL;

  IF v_headers > 0 THEN
    RAISE EXCEPTION 'FAIL: repro project has % phase_header(s) with non-NULL step_number', v_headers;
  END IF;

  RAISE NOTICE 'PASS: repro project step_numbers are correct';
END;
$$;

-- ============================================================
-- SECTION 2: Global invariant check (all projects)
-- ============================================================

DO $$
DECLARE
  v_wrong int;
  v_headers int;
BEGIN
  -- Steps: step_number must equal rank among steps ordered by sort_order
  SELECT COUNT(*) INTO v_wrong
  FROM (
    SELECT
      step_number,
      ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY sort_order)::int AS expected
    FROM checklist_items
    WHERE item_type = 'step'
  ) t
  WHERE step_number IS DISTINCT FROM expected;

  IF v_wrong > 0 THEN
    RAISE EXCEPTION 'FAIL: % step(s) across all projects have wrong step_number', v_wrong;
  END IF;

  -- Headers: step_number must be NULL
  SELECT COUNT(*) INTO v_headers
  FROM checklist_items
  WHERE item_type = 'phase_header' AND step_number IS NOT NULL;

  IF v_headers > 0 THEN
    RAISE EXCEPTION 'FAIL: % phase_header(s) across all projects have non-NULL step_number', v_headers;
  END IF;

  RAISE NOTICE 'PASS: step_number invariant holds across all projects';
END;
$$;

-- ============================================================
-- SECTION 3: Synthetic scenario test (run in a transaction)
-- Creates a scratch project, exercises mutations, checks invariants.
-- Wrap the whole section in BEGIN/ROLLBACK to clean up automatically.
-- ============================================================

-- Step 3a: Create a scratch project and mixed checklist
DO $$
DECLARE
  v_proj_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO projects (id, slug, company_name, title)
  VALUES (v_proj_id, 'TEST-step-number-invariant-' || v_proj_id, 'Test Corp', 'Step Number Test');

  -- Insert: header, 3 steps, header, 2 steps
  INSERT INTO checklist_items (id, project_id, item_type, header_label, actor, action, sort_order, step_number)
  VALUES
    (gen_random_uuid(), v_proj_id, 'phase_header', 'SECTION A', 'Talkpush', 'Section A',      1, NULL),
    (gen_random_uuid(), v_proj_id, 'step',          NULL,        'Candidate', 'Step action 1', 2,    1),
    (gen_random_uuid(), v_proj_id, 'step',          NULL,        'Candidate', 'Step action 2', 3,    2),
    (gen_random_uuid(), v_proj_id, 'step',          NULL,        'Candidate', 'Step action 3', 4,    3),
    (gen_random_uuid(), v_proj_id, 'phase_header', 'SECTION B', 'Talkpush', 'Section B',      5, NULL),
    (gen_random_uuid(), v_proj_id, 'step',          NULL,        'Recruiter', 'Step action 4', 6,    4),
    (gen_random_uuid(), v_proj_id, 'step',          NULL,        'Recruiter', 'Step action 5', 7,    5);

  -- Verify initial state: step_numbers 1-5, headers NULL
  PERFORM renumber_steps(v_proj_id);

  IF (SELECT COUNT(*) FROM checklist_items
      WHERE project_id = v_proj_id AND item_type = 'step'
        AND step_number IS DISTINCT FROM
            ROW_NUMBER() OVER (ORDER BY sort_order)::int) > 0
  THEN
    RAISE EXCEPTION 'FAIL: initial step_numbers wrong after insert';
  END IF;

  RAISE NOTICE 'PASS 3a: initial state correct (5 steps numbered 1-5, 2 headers NULL)';

  -- Step 3b: Simulate a reorder — reverse all items
  PERFORM reorder_checklist_steps(
    v_proj_id,
    (SELECT jsonb_agg(jsonb_build_object('id', id, 'sort_order', 8 - sort_order))
     FROM checklist_items WHERE project_id = v_proj_id)
  );

  IF (SELECT COUNT(*) FROM checklist_items
      WHERE project_id = v_proj_id AND item_type = 'step'
        AND step_number IS DISTINCT FROM
            ROW_NUMBER() OVER (ORDER BY sort_order)::int) > 0
  THEN
    RAISE EXCEPTION 'FAIL: step_numbers wrong after reorder';
  END IF;

  IF (SELECT COUNT(*) FROM checklist_items
      WHERE project_id = v_proj_id AND item_type = 'phase_header' AND step_number IS NOT NULL) > 0
  THEN
    RAISE EXCEPTION 'FAIL: phase_headers have non-NULL step_number after reorder';
  END IF;

  RAISE NOTICE 'PASS 3b: step_numbers correct after reorder';

  -- Step 3c: Delete one step — remaining steps should close the gap
  DELETE FROM checklist_items
  WHERE project_id = v_proj_id AND item_type = 'step'
    AND step_number = 1;

  PERFORM renumber_steps(v_proj_id);

  IF (SELECT COUNT(*) FROM checklist_items
      WHERE project_id = v_proj_id AND item_type = 'step'
        AND step_number IS DISTINCT FROM
            ROW_NUMBER() OVER (ORDER BY sort_order)::int) > 0
  THEN
    RAISE EXCEPTION 'FAIL: step_numbers wrong after delete';
  END IF;

  RAISE NOTICE 'PASS 3c: step_numbers correct after delete (4 steps remain, numbered 1-4)';

  -- Step 3d: Convert a step to phase_header — step_number must become NULL,
  -- remaining steps must shift down
  UPDATE checklist_items
  SET item_type = 'phase_header', step_number = NULL
  WHERE project_id = v_proj_id AND item_type = 'step'
    AND sort_order = (SELECT MIN(sort_order) FROM checklist_items
                      WHERE project_id = v_proj_id AND item_type = 'step');

  PERFORM renumber_steps(v_proj_id);

  IF (SELECT COUNT(*) FROM checklist_items
      WHERE project_id = v_proj_id AND item_type = 'phase_header' AND step_number IS NOT NULL) > 0
  THEN
    RAISE EXCEPTION 'FAIL: converted header still has non-NULL step_number';
  END IF;

  IF (SELECT COUNT(*) FROM checklist_items
      WHERE project_id = v_proj_id AND item_type = 'step'
        AND step_number IS DISTINCT FROM
            ROW_NUMBER() OVER (ORDER BY sort_order)::int) > 0
  THEN
    RAISE EXCEPTION 'FAIL: step_numbers wrong after step→header conversion';
  END IF;

  RAISE NOTICE 'PASS 3d: step_numbers correct after step→phase_header conversion (3 steps remain, numbered 1-3)';

  -- Clean up
  DELETE FROM checklist_items WHERE project_id = v_proj_id;
  DELETE FROM projects WHERE id = v_proj_id;

  RAISE NOTICE 'PASS: all Section 3 scenarios passed';
END;
$$;
