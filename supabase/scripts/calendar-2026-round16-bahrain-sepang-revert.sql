-- ============================================================
-- REVERT CALENDAR CHANGE — 2026 Round 16, Bahrain GP in Malaysia / Sepang
-- ============================================================
-- Undoes calendar-2026-round16-bahrain-sepang-apply.sql:
--   * Deletes the race with meeting_key 1283.
--   * Shifts the rounds above it back down (17-23 -> 16-22).
--
-- !!! DESTRUCTIVE — READ BEFORE RUNNING !!!
-- Every foreign key to races(id) is ON DELETE CASCADE. Deleting this race
-- permanently deletes, for it:
--   * race_predictions
--   * sprint_predictions
--   * race_results
--   * sprint_results
--   * race_lineup_overrides
-- That is every user's predictions for the weekend and any results already
-- entered. Do NOT run this once users have predicted or the race has been
-- scored, unless losing that data is what you want.
--
-- Idempotent: if meeting_key 1283 does not exist the block is a no-op, so the
-- rounds are never shifted down twice.
--
-- The shift uses the same +100 offset trick as the apply script, to avoid
-- colliding with UNIQUE (round, season_id) mid-statement.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_season_id seasons.id%TYPE;
  v_round     races.round%TYPE;
BEGIN
  SELECT id INTO v_season_id FROM seasons WHERE year = 2026;
  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'Season 2026 not found - nothing to do';
  END IF;

  SELECT round INTO v_round
    FROM races
   WHERE meeting_key = 1283
     AND season_id = v_season_id;

  -- Guard: already reverted (or never applied) — do not shift anything.
  IF v_round IS NULL THEN
    RAISE NOTICE 'meeting_key 1283 not found - skipping, rounds NOT shifted';
    RETURN;
  END IF;

  -- ── 1. Remove the race (cascades into predictions/results!) ────
  DELETE FROM races
   WHERE meeting_key = 1283
     AND season_id = v_season_id;

  -- ── 2. Close the gap: every round above it moves down by one ──
  -- Step A: park the affected rounds above the existing range.
  UPDATE races
     SET round = round + 100
   WHERE season_id = v_season_id
     AND round > v_round;

  -- Step B: bring them back down, one lower than before (+100 - 101 = -1).
  UPDATE races
     SET round = round - 101
   WHERE season_id = v_season_id
     AND round > v_round + 100;
END
$$;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────
-- Expect 22 rows, rounds 1..22 with no gaps; meeting_key 1283 absent;
-- round 16 = Singapore (1297) ... round 22 = Abu Dhabi (1303).
-- SELECT r.round, r.meeting_key, r.race_name
--   FROM races r
--  WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
--  ORDER BY r.round;
