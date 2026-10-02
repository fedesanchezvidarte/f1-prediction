-- ============================================================
-- CALENDAR CHANGE — 2026 Round 16, Bahrain GP in Malaysia / Sepang
--                   (meeting_key 1283)
-- ============================================================
-- F1 relocated the Bahrain Grand Prix to the Sepang International Circuit,
-- Malaysia, for this weekend (F1 page: "Bahrain Grand Prix in Malaysia").
-- The race is not in the live calendar, so this script:
--   1. Shifts the existing rounds 16-22 (Singapore ... Abu Dhabi) to 17-23.
--   2. Inserts the new race as round 16.
--
-- Weekend (no sprint): P1, P2, P3, Qualifying, Race.
--   date_start = P1 start         2026-10-02 04:30 UTC (06:30 Spain CEST)
--   date_end   = Qualifying start 2026-10-03 08:00 UTC (10:00 Spain CEST)
--                -> this is the prediction submission DEADLINE.
--   Race itself                   2026-10-04 07:00 UTC
--
-- No lineup overrides for this race.
--
-- Why the rounds are shifted in two steps: races has UNIQUE (round, season_id),
-- and Postgres checks that constraint row by row, so a plain
-- `UPDATE races SET round = round + 1` can collide mid-statement (16 -> 17 while
-- 17 still exists). Moving the rows out of the way with a +100 offset first, then
-- back down to their final value, never produces a duplicate.
--
-- Everything is resolved by business key (season year, meeting_key) — no
-- hardcoded ids. Nothing else references round numbers: the FKs from
-- race_predictions, sprint_predictions, race_results, sprint_results and
-- race_lineup_overrides point at races(id), which does not change.
--
-- Idempotent: if meeting_key 1283 already exists the whole block is a no-op,
-- so the rounds are never shifted twice.
--
-- Paired revert: calendar-2026-round16-bahrain-sepang-revert.sql
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_season_id seasons.id%TYPE;
BEGIN
  SELECT id INTO v_season_id FROM seasons WHERE year = 2026;
  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'Season 2026 not found - nothing to do';
  END IF;

  -- Guard: already applied (meeting_key is UNIQUE across the table).
  IF EXISTS (SELECT 1 FROM races WHERE meeting_key = 1283) THEN
    RAISE NOTICE 'meeting_key 1283 already exists - skipping, rounds NOT shifted again';
    RETURN;
  END IF;

  -- ── 1. Make room: rounds 16-22 -> 17-23 ────────────────────────
  -- Step A: park the affected rounds above the existing range.
  UPDATE races
     SET round = round + 100
   WHERE season_id = v_season_id
     AND round >= 16;

  -- Step B: bring them back down, one higher than before (+100 - 99 = +1).
  UPDATE races
     SET round = round - 99
   WHERE season_id = v_season_id
     AND round >= 116;

  -- ── 2. The new race, round 16 ──────────────────────────────────
  INSERT INTO races (
    meeting_key, race_name, official_name, circuit_short_name,
    country_name, country_code, location,
    date_start, date_end, round, has_sprint, sprint_date_end, season_id
  ) VALUES (
    1283,
    'Bahrain Grand Prix',
    'FORMULA 1 GULF AIR BAHRAIN GRAND PRIX IN MALAYSIA 2026',
    'Sepang',
    'Malaysia', 'MYS', 'Sepang',
    '2026-10-02T04:30:00+00:00',
    '2026-10-03T08:00:00+00:00',
    16, FALSE, NULL, v_season_id
  );
END
$$;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────
-- Expect 23 rows, rounds 1..23 with no gaps; round 16 = meeting_key 1283,
-- round 17 = Singapore (1297) ... round 23 = Abu Dhabi (1303).
-- SELECT r.round, r.meeting_key, r.race_name, r.country_code, r.has_sprint,
--        r.date_start, r.date_end
--   FROM races r
--  WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
--  ORDER BY r.round;
