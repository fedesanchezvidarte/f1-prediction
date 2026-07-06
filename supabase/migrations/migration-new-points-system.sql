-- ============================================================
-- MIGRATION: New Points System (Issue #76)
-- ============================================================
-- Overhauls scoring to reward exact AND near-miss (±1 proximity)
-- predictions, and replaces the single "pole" prediction with a
-- qualifying top-3 (Q1-Q3) prediction for both race and sprint.
--
-- This migration is ADDITIVE and IDEMPOTENT:
--   * New columns use ADD COLUMN IF NOT EXISTS.
--   * Legacy pole columns are KEPT (not dropped). race_results
--     .pole_position_driver_id is NOT NULL, so all write paths
--     continue to populate it = qualifying_top_3[0]. The new
--     qualifying_top_3 columns become the authoritative source.
--   * Backfill statements only touch rows where the new column is
--     still empty/NULL, so re-running is safe.
--
-- Proximity (±1) needs one extra finishing position stored in
-- results beyond the predicted range:
--   * race_results.p11_driver_id   — boundary for race top-10 (P10 → P11)
--   * sprint_results.p9_driver_id  — boundary for sprint top-8 (P8 → P9)
--   * {race,sprint}_results.qualifying_p4_driver_id — boundary for quali top-3 (Q3 → Q4)
--
-- IMPORTANT: Run this migration in the Supabase SQL editor.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. PREDICTIONS — replace single pole with qualifying top-3
-- ─────────────────────────────────────────────────────────────
-- Ordered JSONB array [Q1, Q2, Q3] of driver IDs. Q1 = the old pole.

ALTER TABLE race_predictions
  ADD COLUMN IF NOT EXISTS qualifying_top_3 JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE sprint_predictions
  ADD COLUMN IF NOT EXISTS qualifying_top_3 JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN race_predictions.qualifying_top_3 IS
  'Ordered [Q1, Q2, Q3] driver IDs for the qualifying top-3 prediction. Q1 = legacy pole.';
COMMENT ON COLUMN sprint_predictions.qualifying_top_3 IS
  'Ordered [Q1, Q2, Q3] driver IDs for the sprint qualifying top-3 prediction. Q1 = legacy sprint pole.';

-- Backfill: seed qualifying_top_3 from the legacy pole column for rows
-- that have a pole set but no qualifying array yet.
UPDATE race_predictions
SET qualifying_top_3 = jsonb_build_array(pole_position_driver_id)
WHERE pole_position_driver_id IS NOT NULL
  AND (qualifying_top_3 IS NULL OR qualifying_top_3 = '[]'::jsonb);

UPDATE sprint_predictions
SET qualifying_top_3 = jsonb_build_array(sprint_pole_driver_id)
WHERE sprint_pole_driver_id IS NOT NULL
  AND (qualifying_top_3 IS NULL OR qualifying_top_3 = '[]'::jsonb);


-- ─────────────────────────────────────────────────────────────
-- 2. RACE RESULTS — proximity boundary (P11) + qualifying top-3
-- ─────────────────────────────────────────────────────────────

ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS p11_driver_id INTEGER REFERENCES drivers(id);

ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS qualifying_top_3 JSONB;

ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS qualifying_p4_driver_id INTEGER REFERENCES drivers(id);

COMMENT ON COLUMN race_results.p11_driver_id IS
  'Driver who finished P11. Boundary slot enabling ±1 proximity scoring for the P10 prediction.';
COMMENT ON COLUMN race_results.qualifying_top_3 IS
  'Ordered [Q1, Q2, Q3] driver IDs of the qualifying result. Q1 = legacy pole.';
COMMENT ON COLUMN race_results.qualifying_p4_driver_id IS
  'Driver who qualified Q4. Boundary slot enabling ±1 proximity scoring for the Q3 prediction.';

-- Backfill qualifying_top_3 from the legacy pole column.
UPDATE race_results
SET qualifying_top_3 = jsonb_build_array(pole_position_driver_id)
WHERE pole_position_driver_id IS NOT NULL
  AND (qualifying_top_3 IS NULL OR qualifying_top_3 = '[]'::jsonb);


-- ─────────────────────────────────────────────────────────────
-- 3. SPRINT RESULTS — proximity boundary (P9) + qualifying top-3
-- ─────────────────────────────────────────────────────────────

ALTER TABLE sprint_results
  ADD COLUMN IF NOT EXISTS p9_driver_id INTEGER REFERENCES drivers(id);

ALTER TABLE sprint_results
  ADD COLUMN IF NOT EXISTS qualifying_top_3 JSONB;

ALTER TABLE sprint_results
  ADD COLUMN IF NOT EXISTS qualifying_p4_driver_id INTEGER REFERENCES drivers(id);

COMMENT ON COLUMN sprint_results.p9_driver_id IS
  'Driver who finished P9. Boundary slot enabling ±1 proximity scoring for the P8 prediction.';
COMMENT ON COLUMN sprint_results.qualifying_top_3 IS
  'Ordered [Q1, Q2, Q3] driver IDs of the sprint qualifying result. Q1 = legacy sprint pole.';
COMMENT ON COLUMN sprint_results.qualifying_p4_driver_id IS
  'Driver who qualified Q4 for the sprint. Boundary slot enabling ±1 proximity scoring for the Q3 prediction.';

-- Backfill qualifying_top_3 from the legacy sprint pole column.
UPDATE sprint_results
SET qualifying_top_3 = jsonb_build_array(sprint_pole_driver_id)
WHERE sprint_pole_driver_id IS NOT NULL
  AND (qualifying_top_3 IS NULL OR qualifying_top_3 = '[]'::jsonb);


-- ============================================================
-- END OF MIGRATION
-- ============================================================
