-- ============================================================
-- F1 PREDICTION APP — CHAMPION DUMMY TEST DATA (2026 Season)
-- ============================================================
--
-- PURPOSE:
--   Full dataset designed to exercise the champion-prediction
--   scoring pipeline and achievement-calculation engine.
--   All race + sprint + champion predictions are pre-scored
--   so running the achievement calculator immediately yields
--   deterministic results.
--
-- ──────────────────────────────────────────────────────────
--   USERS
-- ──────────────────────────────────────────────────────────
--   94f8aad2-fda9-4b4a-8b88-80a5ebb73b02  Test user 1
--     · Race/sprint: ALL PERFECT (exact match every event)
--     · Champion:    NOR WDC ✓ + McLaren WCC ✓ → 40 pts
--     · Grand total: 278 pts
--
--   3e6ef1a7-2ab5-4412-87db-02715a7bda0a  Test user 2
--     · Race/sprint: ALL PARTIAL (always P2/P3 swapped → matchPodium
--                   but never perfectPodium; correct race winner P1)
--     · Champion:    VER WDC ✗ + McLaren WCC ✓ → 20 pts
--     · Grand total: 157 pts
--
--   0cc7984c-f582-45ed-ba45-d116dbb6cbf7  Test user 3
--     · Missing Rd1 + Rd2 (race + sprint) ← no champion prediction
--       (missed the pre-season submission window)
--     · Predictions from Rd3 onward, normal mix
--     · Grand total: 79 pts
--
--   fc3a81a6-e828-465f-aac8-380501f9e71b  Test user 4
--     · All predictions completely wrong (0 correct positions,
--       no matching sets, wrong pole/FL/FPS in every race)
--     · Champion:    HAM WDC ✗ + Ferrari WCC ✗ → 0 pts
--     · Grand total: 0 pts
--
-- ──────────────────────────────────────────────────────────
--   SEASON RESULTS USED  (already in race_results / sprint_results)
-- ──────────────────────────────────────────────────────────
--   Rd1:  pole=NOR  top10=[NOR,VER,PIA,RUS,LEC,HAM,ANT,ALB,SAI,GAS]  FL=VER  FPS=NOR
--   Rd2r: pole=PIA  top10=[PIA,NOR,VER,LEC,RUS,HAM,ANT,SAI,ALB,ALO]  FL=NOR  FPS=PIA
--   Rd2s: pole=VER  top8=[VER,NOR,PIA,LEC,HAM,RUS,ANT,ALB]            FL=NOR
--   Rd3:  pole=VER  top10=[VER,NOR,PIA,HAM,LEC,RUS,ANT,SAI,ALB,HUL]  FL=VER  FPS=NOR
--   Rd4:  pole=NOR  top10=[NOR,HAM,LEC,PIA,RUS,VER,ANT,SAI,ALB,GAS]  FL=HAM  FPS=NOR
--   Rd5:  pole=NOR  top10=[NOR,PIA,RUS,VER,LEC,HAM,ANT,SAI,ALB,HAD]  FL=NOR  FPS=PIA
--   Rd6r: pole=NOR  top10=[NOR,PIA,VER,RUS,LEC,HAM,ANT,ALB,SAI,ALO]  FL=NOR  FPS=NOR
--   Rd6s: pole=PIA  top8=[PIA,NOR,VER,LEC,HAM,RUS,ANT,SAI]            FL=PIA
--   Season WDC winner: NOR   Season WCC winner: McLaren
--
-- ──────────────────────────────────────────────────────────
--   EXPECTED ACHIEVEMENTS AFTER calculateAchievementsForUsers()
-- ──────────────────────────────────────────────────────────
--   User 1 (94f8aad2):
--     first_prediction ✓  10_predictions ✓  all_2026_predictions ✓
--     1_correct ✓  10_correct ✓  50_correct ✓   (76 total pos matches < 100)
--     100_points ✓  200_points ✓  300_points ✗ (278 < 300)
--     predict_race_winner ✓  predict_pole ✓  predict_fastest_lap ✓
--     predict_fastest_pit ✓  perfect_podium ✓  perfect_top_10 ✓
--     sprint_winner ✓  sprint_pole ✓  sprint_fastest_lap ✓
--     sprint_podium ✓  perfect_top_8 ✓  hat_trick ✓
--     predict_wdc ✓  predict_wcc ✓
--
--   User 2 (3e6ef1a7):
--     first_prediction ✓  10_predictions ✓
--     1_correct ✓  10_correct ✓  50_correct ✓  (60 pos matches < 100)
--     100_points ✓  (157 pts; no 200_points)
--     predict_race_winner ✓  predict_fastest_lap ✓  predict_fastest_pit ✓
--     predict_pole ✗  perfect_podium ✗  perfect_top_10 ✗
--     sprint_winner ✓  sprint_fastest_lap ✓  sprint_podium ✗  perfect_top_8 ✗
--     hat_trick ✗  (pole never correct)
--     predict_wdc ✓  predict_wcc ✓
--     NOTE: achievement-calculator awards BOTH predict_wdc + predict_wcc when
--           points_earned > 0 (documented TODO in achievement-calculator.ts).
--           User 2 only got WCC correct (20 pts) but both flags fire.
--
--   User 3 (0cc7984c):
--     first_prediction ✓  (has 5 predictions, no champ)
--     1_correct ✓  10_correct ✓  (33 correct pos)
--     predict_race_winner ✓  predict_pole ✓  predict_fastest_lap ✓
--     predict_fastest_pit ✓  perfect_podium ✓  (Rd3)
--     sprint_winner ✓  sprint_fastest_lap ✓  sprint_podium ✓  (Rd6s)
--     hat_trick ✓  (Rd4: pole=NOR✓ + winner=NOR✓ + FL=HAM✓)
--     predict_wdc ✗  predict_wcc ✗  (no champion prediction)
--
--   User 4 (fc3a81a6):
--     first_prediction ✓  10_predictions ✓
--     (all other accuracy/milestone achievements: ✗)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 0 — CLEANUP
-- Remove all existing predictions and leaderboard entries for
-- these 4 users so this file is fully idempotent / rerunnable.
-- ─────────────────────────────────────────────────────────────

DELETE FROM race_predictions WHERE user_id IN (
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  'fc3a81a6-e828-465f-aac8-380501f9e71b'
);

DELETE FROM sprint_predictions WHERE user_id IN (
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  'fc3a81a6-e828-465f-aac8-380501f9e71b'
);

DELETE FROM champion_predictions WHERE user_id IN (
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  'fc3a81a6-e828-465f-aac8-380501f9e71b'
);

DELETE FROM leaderboard WHERE user_id IN (
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  'fc3a81a6-e828-465f-aac8-380501f9e71b'
);

DELETE FROM user_achievements WHERE user_id IN (
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  'fc3a81a6-e828-465f-aac8-380501f9e71b'
);


-- ─────────────────────────────────────────────────────────────
-- SECTION 1 — CHAMPION PREDICTIONS
-- All scored. Season result: NOR (WDC), McLaren (WCC).
-- User 3 intentionally has no champion prediction.
-- ─────────────────────────────────────────────────────────────

-- Test user 1: NOR ✓ + McLaren ✓ → 20+20 = 40 pts (full, pre-season)
INSERT INTO champion_predictions
  (id, user_id, season_id, wdc_driver_id, wcc_team_id, status, is_half_points, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM seasons WHERE year = 2026),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM teams WHERE name = 'McLaren' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored',
  FALSE,
  40,
  '2026-02-20T09:00:00+00:00'
)
ON CONFLICT (user_id, season_id) DO UPDATE SET
  wdc_driver_id  = EXCLUDED.wdc_driver_id,
  wcc_team_id    = EXCLUDED.wcc_team_id,
  status         = EXCLUDED.status,
  is_half_points = EXCLUDED.is_half_points,
  points_earned  = EXCLUDED.points_earned,
  submitted_at   = EXCLUDED.submitted_at;

-- Test user 2: VER ✗ (WDC) + McLaren ✓ (WCC) → 0+20 = 20 pts (partial, full points window)
-- NOTE: achievement-calculator will fire BOTH predict_wdc + predict_wcc because
--       it checks points_earned > 0 (see TODO in achievement-calculator.ts).
INSERT INTO champion_predictions
  (id, user_id, season_id, wdc_driver_id, wcc_team_id, status, is_half_points, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM seasons WHERE year = 2026),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM teams WHERE name = 'McLaren' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored',
  FALSE,
  20,
  '2026-02-21T11:00:00+00:00'
)
ON CONFLICT (user_id, season_id) DO UPDATE SET
  wdc_driver_id  = EXCLUDED.wdc_driver_id,
  wcc_team_id    = EXCLUDED.wcc_team_id,
  status         = EXCLUDED.status,
  is_half_points = EXCLUDED.is_half_points,
  points_earned  = EXCLUDED.points_earned,
  submitted_at   = EXCLUDED.submitted_at;

-- Test user 3: NO champion prediction (missed pre-season window; skipped Rd1+Rd2)

-- Test user 4: HAM ✗ (WDC) + Ferrari ✗ (WCC) → 0 pts
INSERT INTO champion_predictions
  (id, user_id, season_id, wdc_driver_id, wcc_team_id, status, is_half_points, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM seasons WHERE year = 2026),
  (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM teams WHERE name = 'Ferrari' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored',
  FALSE,
  0,
  '2026-02-22T08:30:00+00:00'
)
ON CONFLICT (user_id, season_id) DO UPDATE SET
  wdc_driver_id  = EXCLUDED.wdc_driver_id,
  wcc_team_id    = EXCLUDED.wcc_team_id,
  status         = EXCLUDED.status,
  is_half_points = EXCLUDED.is_half_points,
  points_earned  = EXCLUDED.points_earned,
  submitted_at   = EXCLUDED.submitted_at;


-- ═══════════════════════════════════════════════════════════
-- SECTION 2 — RACE PREDICTIONS  (Rounds 1–6, all scored)
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- RD1 — AUSTRALIAN GP
-- Result: pole=NOR  top10=[NOR,VER,PIA,RUS,LEC,HAM,ANT,ALB,SAI,GAS]  FL=VER  FPS=NOR
-- ───────────────────────────────────────────────────────────

-- ── Test user 1 — PERFECT ────────────────────────────────
-- pred: pole=NOR✓, top10 exact, FL=VER✓, FPS=NOR✓
-- Score: 10pos + perfectPodium(+10) + perfectTop10(+10) + pole(+1) + FL(+1) + FPS(+1) = 33
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM races WHERE round = 1 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 33, '2026-03-05T20:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 2 — PARTIAL ────────────────────────────────
-- pred: pole=VER✗, top10=[NOR,PIA,VER,...] (P2/P3 swapped), FL=NOR✗(VER), FPS=NOR✓
-- posMatch=8 (P1,P4-P10), matchPodium {NOR,PIA,VER}={NOR,VER,PIA}(+5), matchTop10(+5),
-- FPS=NOR✓(+1) → 19
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM races WHERE round = 1 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 19, '2026-03-05T21:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- Test user 3 → NO prediction for Rd1 (missed deadline)

-- ── Test user 4 — ZERO ────────────────────────────────────
-- pred: all 10 drivers not in result top10 → 0 pos matches, no set overlap, wrong pole/FL/FPS
-- Score: 0
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM races WHERE round = 1 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'OCO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BEA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LAW' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'COL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOT' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 0, '2026-03-05T22:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;


-- ───────────────────────────────────────────────────────────
-- RD2 — CHINESE GP (race)
-- Result: pole=PIA  top10=[PIA,NOR,VER,LEC,RUS,HAM,ANT,SAI,ALB,ALO]  FL=NOR  FPS=PIA
-- ───────────────────────────────────────────────────────────

-- ── Test user 1 — PERFECT ────────────────────────────────
-- Score: 10 + 10 + 10 + 1 + 1 + 1 = 33
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM races WHERE round = 2 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 33, '2026-03-12T20:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 2 — PARTIAL ────────────────────────────────
-- pred: pole=NOR✗, top10=[PIA,VER,NOR,LEC,RUS,HAM,ANT,SAI,ALB,ALO] (P2/P3 swapped)
-- posMatch=8 (P1,P4-P10), matchPodium {PIA,VER,NOR}={PIA,NOR,VER}(+5), matchTop10(+5)
-- FL=PIA✗(NOR), FPS=NOR✗(PIA) → 18
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM races WHERE round = 2 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 18, '2026-03-12T21:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- Test user 3 → NO prediction for Rd2 race (missed deadline)

-- ── Test user 4 — ZERO ────────────────────────────────────
-- Drivers predicted: none from top10=[PIA,NOR,VER,LEC,RUS,HAM,ANT,SAI,ALB,ALO]
-- Score: 0
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM races WHERE round = 2 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'OCO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BEA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LAW' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'COL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOT' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 0, '2026-03-12T22:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;


-- ───────────────────────────────────────────────────────────
-- RD3 — JAPANESE GP
-- Result: pole=VER  top10=[VER,NOR,PIA,HAM,LEC,RUS,ANT,SAI,ALB,HUL]  FL=VER  FPS=NOR
-- ───────────────────────────────────────────────────────────

-- ── Test user 1 — PERFECT ────────────────────────────────
-- Score: 33
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM races WHERE round = 3 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 33, '2026-03-26T20:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 2 — PARTIAL ────────────────────────────────
-- pred: pole=NOR✗, top10=[VER,PIA,NOR,HAM,LEC,RUS,ANT,SAI,ALB,HUL] (P2/P3 swapped)
-- posMatch=8 (P1,P4-P10), matchPodium {VER,PIA,NOR}={VER,NOR,PIA}(+5), matchTop10(+5),
-- FL=VER✓(+1), FPS=NOR✓(+1) → 19
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM races WHERE round = 3 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 19, '2026-03-26T21:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 3 — NORMAL (first prediction) ───────────────
-- pred: pole=NOR✗, top10=[VER,NOR,PIA,HAM,LEC,ANT,RUS,SAI,ALB,HUL] (P6/P7 swapped)
-- posMatch=8 (P1-P5,P8-P10), perfectPodium {VER,NOR,PIA} exact✓(+10),
-- matchTop10(+5), FL=VER✓(+1), FPS=NOR✓(+1) → 25
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  (SELECT id FROM races WHERE round = 3 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 25, '2026-03-26T22:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 4 — ZERO ────────────────────────────────────
-- Drivers predicted: none from top10=[VER,NOR,PIA,HAM,LEC,RUS,ANT,SAI,ALB,HUL]
-- Score: 0
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM races WHERE round = 3 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'OCO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BEA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LAW' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'COL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOT' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 0, '2026-03-26T23:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;


-- ───────────────────────────────────────────────────────────
-- RD4 — BAHRAIN GP
-- Result: pole=NOR  top10=[NOR,HAM,LEC,PIA,RUS,VER,ANT,SAI,ALB,GAS]  FL=HAM  FPS=NOR
-- ───────────────────────────────────────────────────────────

-- ── Test user 1 — PERFECT ────────────────────────────────
-- Score: 33
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM races WHERE round = 4 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 33, '2026-04-09T20:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 2 — PARTIAL ────────────────────────────────
-- pred: pole=HAM✗, top10=[NOR,LEC,HAM,PIA,RUS,VER,ANT,SAI,ALB,GAS] (P2/P3 swapped)
-- posMatch=8, matchPodium {NOR,LEC,HAM}={NOR,HAM,LEC}(+5), matchTop10(+5),
-- FL=HAM✓(+1), FPS=NOR✓(+1) → 20
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM races WHERE round = 4 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 20, '2026-04-09T21:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 3 — NORMAL ────────────────────────────────
-- pred: pole=NOR✓, top10=[NOR,HAM,PIA,LEC,VER,RUS,ANT,SAI,ALB,GAS] (P3/P4 swapped + P5/P6 swapped)
-- posMatch=6 (P1,P2,P7-P10), matchTop10(+5) same set,
-- pole=NOR✓(+1), FL=HAM✓(+1), FPS=NOR✓(+1) → 14
-- HAT-TRICK: pole=NOR✓ AND winner=NOR✓ AND FL=HAM✓ → hat_trick ✓
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  (SELECT id FROM races WHERE round = 4 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 14, '2026-04-09T22:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 4 — ZERO ────────────────────────────────────
-- Drivers predicted: none from top10=[NOR,HAM,LEC,PIA,RUS,VER,ANT,SAI,ALB,GAS]
-- Score: 0
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM races WHERE round = 4 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'OCO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BEA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LAW' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'COL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOT' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 0, '2026-04-09T23:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;


-- ───────────────────────────────────────────────────────────
-- RD5 — SAUDI ARABIAN GP
-- Result: pole=NOR  top10=[NOR,PIA,RUS,VER,LEC,HAM,ANT,SAI,ALB,HAD]  FL=NOR  FPS=PIA
-- ───────────────────────────────────────────────────────────

-- ── Test user 1 — PERFECT ────────────────────────────────
-- Score: 33
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM races WHERE round = 5 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 33, '2026-04-16T20:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 2 — PARTIAL ────────────────────────────────
-- pred: pole=PIA✗, top10=[NOR,RUS,PIA,VER,LEC,HAM,ANT,SAI,ALB,HAD] (P2/P3 swapped)
-- posMatch=8, matchPodium {NOR,RUS,PIA}={NOR,PIA,RUS}(+5), matchTop10(+5),
-- FL=PIA✗(NOR), FPS=PIA✓(+1) → 19
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM races WHERE round = 5 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 19, '2026-04-16T21:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 3 — NORMAL ────────────────────────────────
-- pred: pole=NOR✓, top10=[NOR,PIA,VER,RUS,LEC,HAM,ANT,SAI,ALB,HAD] (P3/P4 swapped)
-- posMatch=8 (P1,P2,P5-P10), matchTop10(+5) same set,
-- pole=NOR✓(+1), FL=NOR✓(+1), FPS=PIA✓(+1) → 16
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  (SELECT id FROM races WHERE round = 5 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 16, '2026-04-16T22:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 4 — ZERO ────────────────────────────────────
-- Drivers: none from top10=[NOR,PIA,RUS,VER,LEC,HAM,ANT,SAI,ALB,HAD]
-- Score: 0
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM races WHERE round = 5 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'OCO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BEA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LAW' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'COL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOT' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 0, '2026-04-16T23:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;


-- ───────────────────────────────────────────────────────────
-- RD6 — MIAMI GP (race)
-- Result: pole=NOR  top10=[NOR,PIA,VER,RUS,LEC,HAM,ANT,ALB,SAI,ALO]  FL=NOR  FPS=NOR
-- ───────────────────────────────────────────────────────────

-- ── Test user 1 — PERFECT ────────────────────────────────
-- Score: 33
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM races WHERE round = 6 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 33, '2026-04-30T20:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 2 — PARTIAL ────────────────────────────────
-- pred: pole=PIA✗, top10=[NOR,VER,PIA,RUS,LEC,HAM,ANT,ALB,SAI,ALO] (P2/P3 swapped)
-- posMatch=8, matchPodium {NOR,VER,PIA}={NOR,PIA,VER}(+5), matchTop10(+5),
-- FL=NOR✓(+1), FPS=NOR✓(+1) → 20
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM races WHERE round = 6 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 20, '2026-04-30T21:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 3 — NORMAL ────────────────────────────────
-- pred: pole=VER✗, top10=[LEC,NOR,PIA,VER,RUS,HAM,ANT,ALB,SAI,ALO] (LEC inserted at P1, NOR-RUS shifted)
-- posMatch=5 (P6-P10: HAM✓,ANT✓,ALB✓,SAI✓,ALO✓), matchTop10(+5) same set,
-- FL=VER✗(NOR), FPS=VER✗(NOR) → 10
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  (SELECT id FROM races WHERE round = 6 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 10, '2026-04-30T22:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;

-- ── Test user 4 — ZERO ────────────────────────────────────
-- Drivers: none from top10=[NOR,PIA,VER,RUS,LEC,HAM,ANT,ALB,SAI,ALO]
-- Score: 0
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM races WHERE round = 6 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'OCO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BEA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LAW' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'COL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOT' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 0, '2026-04-30T23:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id  = EXCLUDED.pole_position_driver_id,
  top_10                   = EXCLUDED.top_10,
  fastest_lap_driver_id    = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                   = EXCLUDED.status,
  points_earned            = EXCLUDED.points_earned;


-- ═══════════════════════════════════════════════════════════
-- SECTION 3 — SPRINT PREDICTIONS  (Rounds 2 and 6)
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- RD2 SPRINT — CHINESE GP
-- Result: pole=VER  top8=[VER,NOR,PIA,LEC,HAM,RUS,ANT,ALB]  FL=NOR
-- ───────────────────────────────────────────────────────────

-- ── Test user 1 — PERFECT ────────────────────────────────
-- Score: 8pos + perfectPodium(+5) + perfectTop8(+5) + pole(+1) + FL(+1) = 20
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM races WHERE round = 2 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 20, '2026-03-14T06:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned;

-- ── Test user 2 — PARTIAL ────────────────────────────────
-- pred: pole=NOR✗, top8=[VER,PIA,NOR,LEC,HAM,RUS,ANT,ALB] (P2/P3 swapped)
-- posMatch=6 (P1,P4-P8), matchPodium {VER,PIA,NOR}={VER,NOR,PIA}(+2),
-- matchTop8(+2), FL=NOR✓(+1) → 11
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM races WHERE round = 2 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 11, '2026-03-14T07:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned;

-- Test user 3 → NO sprint prediction for Rd2 (missed deadline)

-- ── Test user 4 — ZERO ────────────────────────────────────
-- Drivers: none from top8=[VER,NOR,PIA,LEC,HAM,RUS,ANT,ALB]
-- Score: 0
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM races WHERE round = 2 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'OCO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BEA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LAW' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'COL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 0, '2026-03-14T08:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned;


-- ───────────────────────────────────────────────────────────
-- RD6 SPRINT — MIAMI GP
-- Result: pole=PIA  top8=[PIA,NOR,VER,LEC,HAM,RUS,ANT,SAI]  FL=PIA
-- ───────────────────────────────────────────────────────────

-- ── Test user 1 — PERFECT ────────────────────────────────
-- Score: 8pos + perfectPodium(+5) + perfectTop8(+5) + pole(+1) + FL(+1) = 20
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM races WHERE round = 6 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 20, '2026-05-02T06:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned;

-- ── Test user 2 — PARTIAL ────────────────────────────────
-- pred: pole=NOR✗, top8=[PIA,VER,NOR,LEC,HAM,RUS,ANT,SAI] (P2/P3 swapped)
-- posMatch=6 (P1,P4-P8), matchPodium {PIA,VER,NOR}={PIA,NOR,VER}(+2),
-- matchTop8(+2), FL=PIA✓(+1) → 11
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM races WHERE round = 6 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 11, '2026-05-02T07:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned;

-- ── Test user 3 — NORMAL ────────────────────────────────
-- pred: pole=NOR✗, top8=[PIA,NOR,VER,LEC,RUS,HAM,ANT,SAI] (P5/P6 swapped from result HAM/RUS)
-- posMatch=6 (P1-P4,P7-P8), perfectPodium {PIA,NOR,VER} exact✓(+5),
-- matchTop8(+2) same set, FL=PIA✓(+1). pole=NOR✗ → 14
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
  (SELECT id FROM races WHERE round = 6 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 14, '2026-05-02T08:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned;

-- ── Test user 4 — ZERO ────────────────────────────────────
-- Drivers: none from top8=[PIA,NOR,VER,LEC,HAM,RUS,ANT,SAI]
-- Score: 0
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
VALUES (
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b',
  (SELECT id FROM races WHERE round = 6 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'OCO' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BEA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'BOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LAW' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'COL' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'STR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'scored', 0, '2026-05-02T09:00:00+00:00'
)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned;


-- ═══════════════════════════════════════════════════════════
-- SECTION 3B — ADDITIONAL RACE PREDICTIONS  (Rounds 7–24)
--
-- These are inserted as submitted (points_earned = NULL) so they can
-- be scored in bulk for full-season simulation.
--
-- User 1: exact match every event
-- User 2: partial, never perfect podium (P2/P3 swapped)
-- User 3: normal mixed predictions
-- User 4: all wrong (drivers outside result top10)
-- ═══════════════════════════════════════════════════════════

-- ── User 1: exact for every race (Rd7–Rd24) ───────────────
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
SELECT
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02' AS user_id,
  rr.race_id,
  rr.pole_position_driver_id,
  rr.top_10,
  rr.fastest_lap_driver_id,
  rr.fastest_pit_stop_driver_id,
  'submitted' AS status,
  NULL::integer AS points_earned,
  ('2026-05-10T18:00:00+00:00'::timestamptz + (r.round || ' days')::interval) AS submitted_at
FROM race_results rr
JOIN races r ON r.id = rr.race_id
WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
  AND r.round BETWEEN 7 AND 24
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                     = EXCLUDED.status,
  points_earned              = EXCLUDED.points_earned,
  submitted_at               = EXCLUDED.submitted_at;


-- ── User 2: partial for every race (Rd7–Rd24) ─────────────
-- winner stays P1, P2/P3 swapped => matchPodium but never perfectPodium
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
SELECT
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a' AS user_id,
  rr.race_id,
  (rr.top_10 ->> 9)::integer AS pole_position_driver_id,
  jsonb_build_array(
    (rr.top_10 ->> 0)::integer,
    (rr.top_10 ->> 2)::integer,
    (rr.top_10 ->> 1)::integer,
    (rr.top_10 ->> 3)::integer,
    (rr.top_10 ->> 4)::integer,
    (rr.top_10 ->> 5)::integer,
    (rr.top_10 ->> 6)::integer,
    (rr.top_10 ->> 7)::integer,
    (rr.top_10 ->> 8)::integer,
    (rr.top_10 ->> 9)::integer
  ) AS top_10,
  rr.fastest_lap_driver_id,
  rr.fastest_pit_stop_driver_id,
  'submitted' AS status,
  NULL::integer AS points_earned,
  ('2026-05-10T19:00:00+00:00'::timestamptz + (r.round || ' days')::interval) AS submitted_at
FROM race_results rr
JOIN races r ON r.id = rr.race_id
WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
  AND r.round BETWEEN 7 AND 24
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                     = EXCLUDED.status,
  points_earned              = EXCLUDED.points_earned,
  submitted_at               = EXCLUDED.submitted_at;


-- ── User 3: normal mix for every race (Rd7–Rd24) ──────────
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
SELECT
  gen_random_uuid(),
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7' AS user_id,
  rr.race_id,
  CASE
    WHEN (r.round % 2) = 1 THEN rr.pole_position_driver_id
    ELSE (rr.top_10 ->> 1)::integer
  END AS pole_position_driver_id,
  CASE
    WHEN (r.round % 2) = 0 THEN jsonb_build_array(
      (rr.top_10 ->> 0)::integer,
      (rr.top_10 ->> 2)::integer,
      (rr.top_10 ->> 1)::integer,
      (rr.top_10 ->> 3)::integer,
      (rr.top_10 ->> 4)::integer,
      (rr.top_10 ->> 5)::integer,
      (rr.top_10 ->> 6)::integer,
      (rr.top_10 ->> 7)::integer,
      (rr.top_10 ->> 8)::integer,
      (rr.top_10 ->> 9)::integer
    )
    ELSE jsonb_build_array(
      (rr.top_10 ->> 0)::integer,
      (rr.top_10 ->> 1)::integer,
      (rr.top_10 ->> 2)::integer,
      (rr.top_10 ->> 3)::integer,
      (rr.top_10 ->> 4)::integer,
      (rr.top_10 ->> 6)::integer,
      (rr.top_10 ->> 5)::integer,
      (rr.top_10 ->> 7)::integer,
      (rr.top_10 ->> 8)::integer,
      (rr.top_10 ->> 9)::integer
    )
  END AS top_10,
  CASE
    WHEN (r.round % 4) <> 0 THEN rr.fastest_lap_driver_id
    ELSE (rr.top_10 ->> 4)::integer
  END AS fastest_lap_driver_id,
  CASE
    WHEN (r.round % 5) <> 0 THEN rr.fastest_pit_stop_driver_id
    ELSE (rr.top_10 ->> 5)::integer
  END AS fastest_pit_stop_driver_id,
  'submitted' AS status,
  NULL::integer AS points_earned,
  ('2026-05-10T20:00:00+00:00'::timestamptz + (r.round || ' days')::interval) AS submitted_at
FROM race_results rr
JOIN races r ON r.id = rr.race_id
WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
  AND r.round BETWEEN 7 AND 24
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                     = EXCLUDED.status,
  points_earned              = EXCLUDED.points_earned,
  submitted_at               = EXCLUDED.submitted_at;


-- ── User 4: all wrong for every race (Rd7–Rd24) ───────────
INSERT INTO race_predictions
  (id, user_id, race_id, pole_position_driver_id, top_10, fastest_lap_driver_id,
   fastest_pit_stop_driver_id, status, points_earned, submitted_at)
SELECT
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b' AS user_id,
  rr.race_id,
  wrong.ids[1] AS pole_position_driver_id,
  jsonb_build_array(
    wrong.ids[1], wrong.ids[2], wrong.ids[3], wrong.ids[4], wrong.ids[5],
    wrong.ids[6], wrong.ids[7], wrong.ids[8], wrong.ids[9], wrong.ids[10]
  ) AS top_10,
  wrong.ids[2] AS fastest_lap_driver_id,
  wrong.ids[3] AS fastest_pit_stop_driver_id,
  'submitted' AS status,
  NULL::integer AS points_earned,
  ('2026-05-10T21:00:00+00:00'::timestamptz + (r.round || ' days')::interval) AS submitted_at
FROM race_results rr
JOIN races r ON r.id = rr.race_id
CROSS JOIN LATERAL (
  SELECT array_agg(d.id ORDER BY d.id) AS ids
  FROM drivers d
  WHERE d.season_id = r.season_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(rr.top_10) e
      WHERE (e.value)::integer = d.id
    )
) AS wrong
WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
  AND r.round BETWEEN 7 AND 24
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  status                     = EXCLUDED.status,
  points_earned              = EXCLUDED.points_earned,
  submitted_at               = EXCLUDED.submitted_at;


-- ═══════════════════════════════════════════════════════════
-- SECTION 3C — ADDITIONAL SPRINT PREDICTIONS  (Rounds 10,19,21,23)
-- ═══════════════════════════════════════════════════════════

-- User 1 sprint exact
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
SELECT
  gen_random_uuid(),
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02' AS user_id,
  sr.race_id,
  sr.sprint_pole_driver_id,
  sr.top_8,
  sr.fastest_lap_driver_id,
  'submitted' AS status,
  NULL::integer AS points_earned,
  ('2026-05-11T18:00:00+00:00'::timestamptz + (r.round || ' days')::interval) AS submitted_at
FROM sprint_results sr
JOIN races r ON r.id = sr.race_id
WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
  AND r.round IN (10, 19, 21, 23)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned,
  submitted_at          = EXCLUDED.submitted_at;

-- User 2 sprint partial (P2/P3 swapped)
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
SELECT
  gen_random_uuid(),
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a' AS user_id,
  sr.race_id,
  (sr.top_8 ->> 7)::integer AS sprint_pole_driver_id,
  jsonb_build_array(
    (sr.top_8 ->> 0)::integer,
    (sr.top_8 ->> 2)::integer,
    (sr.top_8 ->> 1)::integer,
    (sr.top_8 ->> 3)::integer,
    (sr.top_8 ->> 4)::integer,
    (sr.top_8 ->> 5)::integer,
    (sr.top_8 ->> 6)::integer,
    (sr.top_8 ->> 7)::integer
  ) AS top_8,
  sr.fastest_lap_driver_id,
  'submitted' AS status,
  NULL::integer AS points_earned,
  ('2026-05-11T19:00:00+00:00'::timestamptz + (r.round || ' days')::interval) AS submitted_at
FROM sprint_results sr
JOIN races r ON r.id = sr.race_id
WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
  AND r.round IN (10, 19, 21, 23)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned,
  submitted_at          = EXCLUDED.submitted_at;

-- User 3 sprint normal mix
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
SELECT
  gen_random_uuid(),
  '0cc7984c-f582-45ed-ba45-d116dbb6cbf7' AS user_id,
  sr.race_id,
  CASE WHEN (r.round % 2) = 1 THEN sr.sprint_pole_driver_id ELSE (sr.top_8 ->> 1)::integer END AS sprint_pole_driver_id,
  jsonb_build_array(
    (sr.top_8 ->> 0)::integer,
    (sr.top_8 ->> 1)::integer,
    (sr.top_8 ->> 2)::integer,
    (sr.top_8 ->> 3)::integer,
    (sr.top_8 ->> 5)::integer,
    (sr.top_8 ->> 4)::integer,
    (sr.top_8 ->> 6)::integer,
    (sr.top_8 ->> 7)::integer
  ) AS top_8,
  CASE WHEN (r.round % 3) <> 0 THEN sr.fastest_lap_driver_id ELSE (sr.top_8 ->> 5)::integer END AS fastest_lap_driver_id,
  'submitted' AS status,
  NULL::integer AS points_earned,
  ('2026-05-11T20:00:00+00:00'::timestamptz + (r.round || ' days')::interval) AS submitted_at
FROM sprint_results sr
JOIN races r ON r.id = sr.race_id
WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
  AND r.round IN (10, 19, 21, 23)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned,
  submitted_at          = EXCLUDED.submitted_at;

-- User 4 sprint all wrong
INSERT INTO sprint_predictions
  (id, user_id, race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id,
   status, points_earned, submitted_at)
SELECT
  gen_random_uuid(),
  'fc3a81a6-e828-465f-aac8-380501f9e71b' AS user_id,
  sr.race_id,
  wrong.ids[1] AS sprint_pole_driver_id,
  jsonb_build_array(
    wrong.ids[1], wrong.ids[2], wrong.ids[3], wrong.ids[4],
    wrong.ids[5], wrong.ids[6], wrong.ids[7], wrong.ids[8]
  ) AS top_8,
  wrong.ids[2] AS fastest_lap_driver_id,
  'submitted' AS status,
  NULL::integer AS points_earned,
  ('2026-05-11T21:00:00+00:00'::timestamptz + (r.round || ' days')::interval) AS submitted_at
FROM sprint_results sr
JOIN races r ON r.id = sr.race_id
CROSS JOIN LATERAL (
  SELECT array_agg(d.id ORDER BY d.id) AS ids
  FROM drivers d
  WHERE d.season_id = r.season_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(sr.top_8) e
      WHERE (e.value)::integer = d.id
    )
) AS wrong
WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
  AND r.round IN (10, 19, 21, 23)
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned,
  submitted_at          = EXCLUDED.submitted_at;


-- ─────────────────────────────────────────────────────────────
-- SECTION 4 — LEADERBOARD
-- (Baseline snapshot after Rounds 1–6 scored; rounds 7–24 above are
-- inserted as submitted and should be scored before recomputing leaderboard.)
--
-- total_points  = all scored race + sprint + champion points
-- predictions_count = scored race + scored sprint + scored champion (if any)
-- best_race_points  = max of scored race predictions only
-- perfect_podiums   = count of race predictions with perfectPodium
--   (sprint perfect podiums are NOT counted per scoring-service.ts behaviour)
--
-- User 1 (94f8aad2):
--   race:   33×6 = 198   sprint: 20×2 = 40   champ: 40   total: 278
--   predictions_count: 6r + 2s + 1c = 9
--   perfect_podiums: 6 (Rd1–Rd6 race all perfect)   best_race: 33   rank: 1
--
-- User 2 (3e6ef1a7):
--   race:   19+18+19+20+19+20 = 115   sprint: 11×2 = 22   champ: 20   total: 157
--   predictions_count: 9   perfect_podiums: 0   best_race: 20   rank: 2
--
-- User 3 (0cc7984c):
--   race:   25+14+16+10 = 65   sprint: 14   champ: 0 (no pred)   total: 79
--   predictions_count: 4r + 1s = 5   perfect_podiums: 1 (Rd3)   best_race: 25   rank: 3
--
-- User 4 (fc3a81a6):
--   race: 0   sprint: 0   champ: 0   total: 0
--   predictions_count: 9   perfect_podiums: 0   best_race: 0   rank: 4
-- ─────────────────────────────────────────────────────────────

INSERT INTO leaderboard
  (user_id, season_id, total_points, predictions_count, perfect_podiums, best_race_points, rank)
VALUES
  (
    '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
    (SELECT id FROM seasons WHERE year = 2026),
    278, 9, 6, 33, 1
  ),
  (
    '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
    (SELECT id FROM seasons WHERE year = 2026),
    157, 9, 0, 20, 2
  ),
  (
    '0cc7984c-f582-45ed-ba45-d116dbb6cbf7',
    (SELECT id FROM seasons WHERE year = 2026),
    79, 5, 1, 25, 3
  ),
  (
    'fc3a81a6-e828-465f-aac8-380501f9e71b',
    (SELECT id FROM seasons WHERE year = 2026),
    0, 9, 0, 0, 4
  )
ON CONFLICT (user_id, season_id) DO UPDATE SET
  total_points      = EXCLUDED.total_points,
  predictions_count = EXCLUDED.predictions_count,
  perfect_podiums   = EXCLUDED.perfect_podiums,
  best_race_points  = EXCLUDED.best_race_points,
  rank              = EXCLUDED.rank,
  updated_at        = NOW();


-- ─────────────────────────────────────────────────────────────
-- END OF CHAMPION TEST DATA
-- ─────────────────────────────────────────────────────────────
--
-- After importing this file to Supabase, run the achievement
-- calculation from the admin panel (or via the API endpoint
-- POST /api/achievements/calculate) to populate user_achievements
-- for these 4 users.
--
-- Score summary:
--   User 1  94f8aad2  278 pts  all perfect            rank 1
--   User 2  3e6ef1a7  157 pts  all partial            rank 2
--   User 3  0cc7984c   79 pts  normal / no Rd1-Rd2    rank 3
--   User 4  fc3a81a6    0 pts  zero correct           rank 4
-- ─────────────────────────────────────────────────────────────
