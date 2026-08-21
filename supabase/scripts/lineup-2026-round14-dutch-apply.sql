-- ============================================================
-- LINEUP CHANGE — 2026 Round 14, Dutch GP (meeting_key 1293)
-- ============================================================
-- Liam Lawson (#30) races for RED BULL RACING this weekend only.
--   -> His WDC points still go to Lawson; his round-14 WCC points
--      go to Red Bull Racing, NOT Racing Bulls.
-- Isack Hadjar (#6) is OUT this weekend.
--   -> Shown but unselectable in every round-14 picker.
-- Yuki Tsunoda (#22) joins the grid at RACING BULLS (permanent row).
--
-- Prerequisite: migration-race-lineup-overrides.sql
-- Paired revert: lineup-2026-round14-dutch-revert.sql
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

BEGIN;

-- ── 1. Yuki Tsunoda joins the grid (permanent driver row) ─────
-- #22 is unused in the 2026 season. This is NOT undone by the
-- revert script: deleting a driver cascades into predictions and
-- results. Bench him from the admin Lineup panel instead.
INSERT INTO drivers (first_name, last_name, name_acronym, driver_number, team_id, season_id, is_active)
VALUES (
  'Yuki', 'Tsunoda', 'TSU', 22,
  (SELECT id FROM teams   WHERE name = 'Racing Bulls'
                            AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM seasons WHERE year = 2026),
  TRUE
)
ON CONFLICT (driver_number, season_id) DO NOTHING;

-- ── 2. Per-race overrides for round 14 ────────────────────────
-- Ids resolved by business key so this is portable across environments.
INSERT INTO race_lineup_overrides (race_id, driver_id, is_unavailable, team_id, note)
VALUES
  -- Hadjar: out this weekend, no team change.
  (
    (SELECT id FROM races   WHERE meeting_key = 1293),
    (SELECT id FROM drivers WHERE driver_number = 6
                              AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    TRUE,
    NULL,
    'Out - Dutch GP 2026'
  ),
  -- Lawson: on the grid, but scoring for Red Bull Racing this weekend.
  (
    (SELECT id FROM races   WHERE meeting_key = 1293),
    (SELECT id FROM drivers WHERE driver_number = 30
                              AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    FALSE,
    (SELECT id FROM teams   WHERE name = 'Red Bull Racing'
                              AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    'Racing for Red Bull - Dutch GP 2026'
  )
ON CONFLICT (race_id, driver_id) DO UPDATE
  SET is_unavailable = EXCLUDED.is_unavailable,
      team_id        = EXCLUDED.team_id,
      note           = EXCLUDED.note;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────
-- SELECT d.driver_number, d.last_name, o.is_unavailable, t.name AS override_team, o.note
--   FROM race_lineup_overrides o
--   JOIN drivers d ON d.id = o.driver_id
--   LEFT JOIN teams t ON t.id = o.team_id
--  WHERE o.race_id = (SELECT id FROM races WHERE meeting_key = 1293);
