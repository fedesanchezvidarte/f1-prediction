-- ============================================================
-- MIGRATION: Unified Season Award Predictions
-- ============================================================
-- Collapses champion_predictions + team_best_driver_predictions
-- into the season_award_* framework, enabling per-category
-- half-points tracking independently per award row.
--
-- Context:
--   - season_award_types already seeded with WDC (25 pts) & WCC (15 pts)
--   - 20 champion_predictions rows (all is_half_points = false)
--   - 177 team_best_driver_predictions rows
--   - 0 champion_results / team_best_driver_results  → steps 1d & 1e are no-ops
--
-- After verifying correctness, run the drop-legacy-tables block at the bottom.
-- ============================================================

BEGIN;

-- ── 1a. Align point values & add missing award types ────────────────────────

-- Correct the WDC/WCC point values to match current scoring logic
UPDATE season_award_types SET points_value = 20 WHERE slug = 'wdc';
UPDATE season_award_types SET points_value = 20 WHERE slug = 'wcc';

-- Three missing champion categories
INSERT INTO season_award_types
  (season_id, slug, name, description, subject_type, scope_team_id, points_value, sort_order)
VALUES
  (1, 'most_wins',
   'Most Race Wins',
   'Which driver will have the most race wins this season?',
   'driver', NULL, 10, 30),
  (1, 'most_podiums',
   'Most Podiums',
   'Which driver will have the most podium finishes this season?',
   'driver', NULL, 10, 40),
  (1, 'most_dnfs',
   'Most DNFs',
   'Which driver will have the most DNFs this season?',
   'driver', NULL, 10, 50);

-- One best-driver award per active team in season 1
-- Teams in season 1 (IDs 1–11): McLaren, Mercedes, Red Bull, Ferrari,
--   Williams, Racing Bulls, Aston Martin, Haas, Audi, Alpine, Cadillac
INSERT INTO season_award_types
  (season_id, slug, name, description, subject_type, scope_team_id, points_value, sort_order)
SELECT
  1,
  'best_driver_' || t.id,
  'Best Driver – ' || t.name,
  'Which driver will score the most points for ' || t.name || ' this season?',
  'driver',
  t.id,
  2,
  100 + t.id
FROM teams t
WHERE t.season_id = 1;

-- ── 1b. Migrate champion_predictions → season_award_predictions ─────────────
-- One row per user per award slug (5 slugs × 20 users = 100 rows).
-- All existing rows have is_half_points = false and points_earned resets to 0
-- (season hasn't started; rescoring will populate points_earned correctly).

INSERT INTO season_award_predictions
  (user_id, season_id, award_type_id, driver_id, team_id,
   status, points_earned, is_half_points, submitted_at)
SELECT
  cp.user_id,
  cp.season_id,
  sat.id,
  CASE sat.slug
    WHEN 'wdc'          THEN cp.wdc_driver_id
    WHEN 'most_wins'    THEN cp.most_wins_driver_id
    WHEN 'most_podiums' THEN cp.most_podiums_driver_id
    WHEN 'most_dnfs'    THEN cp.most_dnfs_driver_id
    ELSE NULL
  END AS driver_id,
  CASE WHEN sat.slug = 'wcc' THEN cp.wcc_team_id ELSE NULL END AS team_id,
  cp.status,
  0,                   -- points_earned reset; re-score after migration
  cp.is_half_points,
  cp.submitted_at
FROM champion_predictions cp
CROSS JOIN season_award_types sat
WHERE sat.slug      IN ('wdc', 'wcc', 'most_wins', 'most_podiums', 'most_dnfs')
  AND sat.season_id  = cp.season_id;

-- ── 1c. Migrate team_best_driver_predictions → season_award_predictions ──────
-- One row per user per team (177 existing rows).

INSERT INTO season_award_predictions
  (user_id, season_id, award_type_id, driver_id, team_id,
   status, points_earned, is_half_points, submitted_at)
SELECT
  tbdp.user_id,
  tbdp.season_id::int,
  sat.id,
  tbdp.driver_id,
  NULL,
  tbdp.status,
  COALESCE(tbdp.points_earned, 0),
  tbdp.is_half_points,
  tbdp.submitted_at
FROM team_best_driver_predictions tbdp
JOIN season_award_types sat
  ON  sat.slug      = 'best_driver_' || tbdp.team_id
  AND sat.season_id = tbdp.season_id;

-- ── 1d. Migrate champion_results → season_award_results ─────────────────────
-- No-op at time of writing (champion_results is empty), kept for completeness.

INSERT INTO season_award_results
  (season_id, award_type_id, driver_id, team_id, source)
SELECT
  cr.season_id,
  sat.id,
  CASE sat.slug
    WHEN 'wdc'          THEN cr.wdc_driver_id
    WHEN 'most_wins'    THEN cr.most_wins_driver_id
    WHEN 'most_podiums' THEN cr.most_podiums_driver_id
    WHEN 'most_dnfs'    THEN cr.most_dnfs_driver_id
    ELSE NULL
  END AS driver_id,
  CASE WHEN sat.slug = 'wcc' THEN cr.wcc_team_id ELSE NULL END AS team_id,
  cr.source
FROM champion_results cr
CROSS JOIN season_award_types sat
WHERE sat.slug      IN ('wdc', 'wcc', 'most_wins', 'most_podiums', 'most_dnfs')
  AND sat.season_id  = cr.season_id;

-- ── 1e. Migrate team_best_driver_results → season_award_results ──────────────
-- No-op at time of writing (team_best_driver_results is empty).

INSERT INTO season_award_results
  (season_id, award_type_id, driver_id, team_id, source)
SELECT
  tbdr.season_id::int,
  sat.id,
  tbdr.driver_id,
  NULL,
  tbdr.source
FROM team_best_driver_results tbdr
JOIN season_award_types sat
  ON  sat.slug      = 'best_driver_' || tbdr.team_id
  AND sat.season_id = tbdr.season_id;

-- ── Verification queries (run before committing) ─────────────────────────────
-- Expected after migration:
--   season_award_types  → 16 rows  (2 existing + 3 champion + 11 team)
--   season_award_predictions → 277 rows  (100 champion + 177 team)
--   season_award_results     → 0 rows    (no results yet)
--
-- SELECT COUNT(*) FROM season_award_types;        -- expect 16
-- SELECT COUNT(*) FROM season_award_predictions;  -- expect 277
-- SELECT COUNT(*) FROM season_award_results;      -- expect 0

COMMIT;

-- ============================================================
-- STEP 10 — Drop legacy tables (run ONLY after full verification)
-- ============================================================
-- Execute this block separately once the app is confirmed working
-- against the new tables in production.
--
-- DROP TABLE IF EXISTS champion_predictions         CASCADE;
-- DROP TABLE IF EXISTS champion_results             CASCADE;
-- DROP TABLE IF EXISTS team_best_driver_predictions CASCADE;
-- DROP TABLE IF EXISTS team_best_driver_results     CASCADE;
