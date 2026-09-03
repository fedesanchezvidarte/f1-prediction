-- ============================================================
-- LINEUP CHANGE — 2026 Round 13, Italian GP / Monza (meeting_key 1294)
-- ============================================================
-- F1 announced Isack Hadjar is out again, so Monza repeats the Dutch GP
-- swap (meeting_key 1293):
--   Isack Hadjar (#6)  — OUT this weekend.
--   Liam Lawson  (#30) — races for RED BULL RACING this weekend only.
--     -> His WDC points still go to Lawson; his round-13 WCC points
--        go to Red Bull Racing, NOT Racing Bulls.
--   Yuki Tsunoda (#22) — back on the grid at RACING BULLS. His row already
--     exists from the Dutch GP change (lineup-2026-round14-dutch-apply.sql)
--     and was only deactivated, not deleted, by
--     lineup-2026-round13-monza-apply.sql. Reactivating is enough — no
--     re-INSERT needed.
--
-- This does NOT touch the meeting_key 1293 (Dutch GP) overrides — that
-- round is already scored and stays exactly as it was.
--
-- Prerequisite: migration-race-lineup-overrides.sql
-- Paired revert: lineup-2026-round13-monza-hadjar-out-revert.sql
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

BEGIN;

-- ── 1. Yuki Tsunoda back on the grid ───────────────────────────
UPDATE drivers
   SET is_active = TRUE
 WHERE driver_number = 22
   AND season_id = (SELECT id FROM seasons WHERE year = 2026);

-- ── 2. Per-race overrides for Monza (meeting_key 1294) ─────────
-- Ids resolved by business key so this is portable across environments.
INSERT INTO race_lineup_overrides (race_id, driver_id, is_unavailable, team_id, note)
VALUES
  -- Hadjar: out this weekend, no team change.
  (
    (SELECT id FROM races   WHERE meeting_key = 1294),
    (SELECT id FROM drivers WHERE driver_number = 6
                              AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    TRUE,
    NULL,
    'Out - Italian GP 2026'
  ),
  -- Lawson: on the grid, but scoring for Red Bull Racing this weekend.
  (
    (SELECT id FROM races   WHERE meeting_key = 1294),
    (SELECT id FROM drivers WHERE driver_number = 30
                              AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    FALSE,
    (SELECT id FROM teams   WHERE name = 'Red Bull Racing'
                              AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    'Racing for Red Bull - Italian GP 2026'
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
--  WHERE o.race_id = (SELECT id FROM races WHERE meeting_key = 1294);
