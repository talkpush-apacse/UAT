-- dry-run-step-number-backfill.sql
-- Shows every project where step_numbers are stale (wrong value for steps,
-- or non-NULL value for phase_headers). Run this in the Supabase SQL Editor
-- or via psql before applying the backfill migration.
--
-- Expected output for a healthy database: 0 rows.
-- Any row here represents a project that needs the backfill.

WITH step_ranks AS (
  -- Compute what each step's step_number *should* be:
  -- its 1-indexed rank among steps in the project ordered by sort_order.
  SELECT
    ci.id,
    ci.project_id,
    ci.step_number          AS current_step_number,
    ROW_NUMBER() OVER (
      PARTITION BY ci.project_id
      ORDER BY ci.sort_order
    )::int                  AS expected_step_number
  FROM checklist_items ci
  WHERE ci.item_type = 'step'
),
project_diffs AS (
  SELECT
    sr.project_id,
    COUNT(*) FILTER (
      WHERE sr.current_step_number IS DISTINCT FROM sr.expected_step_number
    ) AS wrong_steps
  FROM step_ranks sr
  GROUP BY sr.project_id
),
header_issues AS (
  -- Phase headers should always have step_number = NULL.
  SELECT project_id, COUNT(*) AS headers_with_step_number
  FROM checklist_items
  WHERE item_type = 'phase_header'
    AND step_number IS NOT NULL
  GROUP BY project_id
)
SELECT
  p.slug,
  p.company_name,
  COALESCE(pd.wrong_steps, 0)              AS wrong_step_numbers,
  COALESCE(hi.headers_with_step_number, 0) AS headers_with_step_number
FROM projects p
LEFT JOIN project_diffs pd ON pd.project_id = p.id
LEFT JOIN header_issues hi ON hi.project_id = p.id
WHERE
  COALESCE(pd.wrong_steps, 0) > 0
  OR COALESCE(hi.headers_with_step_number, 0) > 0
ORDER BY p.company_name;
