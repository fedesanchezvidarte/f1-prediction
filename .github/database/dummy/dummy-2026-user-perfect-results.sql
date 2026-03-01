-- ============================================================
-- F1 PREDICTION APP — PERFECT USER PREDICTIONS (2026)
-- ============================================================
--
-- USER: 94f8aad2-fda9-4b4a-8b88-80a5ebb73b02
--
-- PURPOSE:
--   All predictions perfectly match actual results.
--   Serves as the test for max points and all achievements.
--   Depends on dummy-2026-race-results.sql and
--   dummy-2026-champion-results.sql being loaded first.
--
-- ──────────────────────────────────────────────────────────
--   SCORING SUMMARY
-- ──────────────────────────────────────────────────────────
--   24 races  × 34 pts   = 816
--   7 sprints × 20 pts   = 140
--   Champion prediction   =  70  (WDC=20 + WCC=20 + DNFs=10 + Podiums=10 + Wins=10)
--   Team best drivers     =  22  (11 × 2)
--   ─────────────────────────────
--   Grand total           = 1048
--
-- ──────────────────────────────────────────────────────────
--   RACE SCORING BREAKDOWN (each = 34 pts)
-- ──────────────────────────────────────────────────────────
--   10 position matches = 10
--   pole match          =  1
--   fastest lap match   =  1
--   fastest pit stop    =  1
--   driver of the day   =  1
--   perfect podium      = 10
--   perfect top 10      = 10
--                          ──
--                          34
--
-- ──────────────────────────────────────────────────────────
--   SPRINT SCORING BREAKDOWN (each = 20 pts)
-- ──────────────────────────────────────────────────────────
--   8 position matches  =  8
--   sprint pole match   =  1
--   fastest lap match   =  1
--   perfect podium      =  5
--   perfect top 8       =  5
--                          ──
--                          20
--
-- ──────────────────────────────────────────────────────────
--   EXPECTED ACHIEVEMENTS (ALL should fire)
-- ──────────────────────────────────────────────────────────
--   first_prediction ✓  10_predictions ✓  20_predictions ✓
--   all_2026_predictions ✓
--   1_correct ✓  10_correct ✓  50_correct ✓  100_correct ✓
--   100_points ✓  200_points ✓  300_points ✓
--   predict_race_winner ✓  predict_pole ✓
--   predict_fastest_lap ✓  predict_fastest_pit ✓
--   perfect_podium ✓  perfect_top_10 ✓
--   sprint_winner ✓  sprint_pole ✓  sprint_fastest_lap ✓
--   sprint_podium ✓  perfect_top_8 ✓
--   hat_trick ✓  fans_choice ✓
--   predict_wdc ✓  predict_wcc ✓
--   predict_1_team_best ✓  predict_5_team_best ✓  predict_10_team_best ✓
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 0 — CLEANUP
-- ─────────────────────────────────────────────────────────────

DELETE FROM race_predictions
  WHERE user_id = '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02';

DELETE FROM sprint_predictions
  WHERE user_id = '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02';

DELETE FROM champion_predictions
  WHERE user_id = '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02';

DELETE FROM team_best_driver_predictions
  WHERE user_id = '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02';

DELETE FROM leaderboard
  WHERE user_id = '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02';

DELETE FROM user_achievements
  WHERE user_id = '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02';


-- ═══════════════════════════════════════════════════════════
-- SECTION 1 — RACE PREDICTIONS (24 rounds — all perfect)
--
-- Predictions are IDENTICAL to actual results → 34 pts each
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
d AS (SELECT name_acronym AS a, id FROM drivers WHERE season_id = (SELECT id FROM s)),
pred_data(rnd, pole, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, fl, fps, dotd) AS (VALUES
  --  Predictions = exact copy of results
  ( 1::int, 'NOR'::text,'NOR'::text,'VER'::text,'PIA'::text,'RUS'::text,'LEC'::text,'HAM'::text,'ANT'::text,'ALB'::text,'SAI'::text,'GAS'::text,'VER'::text,'NOR'::text,'NOR'::text),
  ( 2, 'PIA','PIA','NOR','VER','LEC','RUS','HAM','ANT','SAI','ALB','ALO','NOR','PIA','PIA'),
  ( 3, 'VER','VER','NOR','PIA','HAM','LEC','RUS','ANT','SAI','ALB','HUL','VER','NOR','VER'),
  ( 4, 'NOR','NOR','HAM','LEC','PIA','RUS','VER','ANT','SAI','ALB','GAS','HAM','NOR','HAM'),
  ( 5, 'NOR','NOR','PIA','RUS','VER','LEC','HAM','ANT','SAI','ALB','HAD','NOR','PIA','NOR'),
  ( 6, 'NOR','NOR','PIA','VER','RUS','LEC','HAM','ANT','ALB','SAI','ALO','NOR','NOR','NOR'),
  ( 7, 'LEC','LEC','PIA','NOR','VER','RUS','HAM','ANT','SAI','ALB','ALO','LEC','PIA','LEC'),
  ( 8, 'NOR','NOR','RUS','PIA','LEC','VER','HAM','ANT','ALB','GAS','SAI','NOR','PIA','RUS'),
  ( 9, 'VER','VER','NOR','HAM','PIA','LEC','RUS','ANT','SAI','GAS','HUL','VER','NOR','VER'),
  (10, 'PIA','PIA','NOR','VER','RUS','LEC','HAM','ANT','SAI','ALB','HAD','PIA','NOR','PIA'),
  (11, 'NOR','NOR','VER','RUS','PIA','HAM','LEC','ANT','ALB','SAI','LAW','NOR','VER','NOR'),
  (12, 'RUS','RUS','NOR','PIA','VER','LEC','HAM','ANT','SAI','ALB','BEA','RUS','NOR','RUS'),
  (13, 'VER','VER','NOR','LEC','PIA','RUS','HAM','ANT','ALB','HUL','SAI','VER','PIA','VER'),
  (14, 'NOR','NOR','PIA','VER','LEC','RUS','HAM','ALB','ANT','GAS','ALO','NOR','NOR','NOR'),
  (15, 'PIA','PIA','NOR','VER','HAM','RUS','LEC','ANT','SAI','ALB','OCO','PIA','VER','PIA'),
  (16, 'NOR','NOR','VER','PIA','RUS','HAM','LEC','ANT','ALB','SAI','STR','VER','NOR','NOR'),
  (17, 'VER','VER','NOR','PIA','LEC','HAM','RUS','SAI','ANT','ALB','GAS','NOR','VER','VER'),
  (18, 'LEC','LEC','NOR','HAM','PIA','VER','RUS','ANT','SAI','ALB','BOR','LEC','NOR','LEC'),
  (19, 'RUS','RUS','NOR','VER','PIA','LEC','HAM','ANT','ALB','SAI','LAW','NOR','RUS','RUS'),
  (20, 'NOR','NOR','PIA','VER','HAM','RUS','LEC','ANT','SAI','ALO','ALB','NOR','PIA','NOR'),
  (21, 'PIA','PIA','NOR','VER','RUS','HAM','LEC','ANT','ALB','SAI','HUL','PIA','NOR','PIA'),
  (22, 'VER','VER','NOR','PIA','LEC','RUS','HAM','ANT','SAI','ALB','GAS','VER','NOR','VER'),
  (23, 'LEC','HAM','NOR','VER','PIA','LEC','RUS','ANT','SAI','ALB','PER','HAM','NOR','HAM'),
  (24, 'NOR','NOR','VER','PIA','RUS','LEC','HAM','ANT','ALB','SAI','GAS','NOR','NOR','NOR')
)
INSERT INTO race_predictions
  (user_id, race_id, pole_position_driver_id, top_10,
   fastest_lap_driver_id, fastest_pit_stop_driver_id,
   driver_of_the_day_driver_id,
   status, points_earned, submitted_at)
SELECT
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02'::uuid,
  r.id,
  dpole.id,
  jsonb_build_array(d1.id, d2.id, d3.id, d4.id, d5.id,
                    d6.id, d7.id, d8.id, d9.id, d10.id),
  dfl.id,
  dfps.id,
  ddotd.id,
  'scored',
  34,                                      -- max race score
  r.date_start - interval '1 day'         -- submitted before race
FROM pred_data pd
JOIN races r    ON r.round = pd.rnd AND r.season_id = (SELECT id FROM s)
JOIN d dpole    ON dpole.a = pd.pole
JOIN d d1       ON d1.a    = pd.p1
JOIN d d2       ON d2.a    = pd.p2
JOIN d d3       ON d3.a    = pd.p3
JOIN d d4       ON d4.a    = pd.p4
JOIN d d5       ON d5.a    = pd.p5
JOIN d d6       ON d6.a    = pd.p6
JOIN d d7       ON d7.a    = pd.p7
JOIN d d8       ON d8.a    = pd.p8
JOIN d d9       ON d9.a    = pd.p9
JOIN d d10      ON d10.a   = pd.p10
JOIN d dfl      ON dfl.a   = pd.fl
JOIN d dfps     ON dfps.a  = pd.fps
JOIN d ddotd    ON ddotd.a = pd.dotd
ON CONFLICT (user_id, race_id) DO UPDATE SET
  pole_position_driver_id     = EXCLUDED.pole_position_driver_id,
  top_10                      = EXCLUDED.top_10,
  fastest_lap_driver_id       = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id  = EXCLUDED.fastest_pit_stop_driver_id,
  driver_of_the_day_driver_id = EXCLUDED.driver_of_the_day_driver_id,
  status                      = EXCLUDED.status,
  points_earned               = EXCLUDED.points_earned,
  submitted_at                = EXCLUDED.submitted_at;


-- ═══════════════════════════════════════════════════════════
-- SECTION 2 — SPRINT PREDICTIONS (7 sprint rounds — perfect)
--
-- Predictions are IDENTICAL to actual sprint results → 20 pts each
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
d AS (SELECT name_acronym AS a, id FROM drivers WHERE season_id = (SELECT id FROM s)),
sprint_pred(rnd, pole, p1, p2, p3, p4, p5, p6, p7, p8, fl) AS (VALUES
  ( 2::int, 'VER'::text,'VER'::text,'NOR'::text,'PIA'::text,'LEC'::text,'HAM'::text,'RUS'::text,'ANT'::text,'ALB'::text,'NOR'::text),
  ( 6,      'PIA',      'PIA',      'NOR',      'VER',      'LEC',      'HAM',      'RUS',      'ANT',      'SAI',      'PIA'),
  ( 7,      'NOR',      'NOR',      'LEC',      'PIA',      'VER',      'RUS',      'HAM',      'ANT',      'SAI',      'LEC'),
  (11,      'VER',      'VER',      'NOR',      'RUS',      'PIA',      'HAM',      'LEC',      'ANT',      'ALB',      'NOR'),
  (14,      'PIA',      'PIA',      'NOR',      'VER',      'LEC',      'RUS',      'HAM',      'ALB',      'ANT',      'NOR'),
  (18,      'LEC',      'LEC',      'NOR',      'HAM',      'PIA',      'VER',      'RUS',      'ANT',      'SAI',      'NOR'),
  (23,      'VER',      'VER',      'NOR',      'HAM',      'PIA',      'LEC',      'RUS',      'ANT',      'SAI',      'HAM')
)
INSERT INTO sprint_predictions
  (user_id, race_id, sprint_pole_driver_id, top_8,
   fastest_lap_driver_id,
   status, points_earned, submitted_at)
SELECT
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02'::uuid,
  r.id,
  dpole.id,
  jsonb_build_array(d1.id, d2.id, d3.id, d4.id, d5.id, d6.id, d7.id, d8.id),
  dfl.id,
  'scored',
  20,                                      -- max sprint score
  r.date_start - interval '1 day'
FROM sprint_pred sp
JOIN races r    ON r.round = sp.rnd AND r.season_id = (SELECT id FROM s)
JOIN d dpole    ON dpole.a = sp.pole
JOIN d d1       ON d1.a    = sp.p1
JOIN d d2       ON d2.a    = sp.p2
JOIN d d3       ON d3.a    = sp.p3
JOIN d d4       ON d4.a    = sp.p4
JOIN d d5       ON d5.a    = sp.p5
JOIN d d6       ON d6.a    = sp.p6
JOIN d d7       ON d7.a    = sp.p7
JOIN d d8       ON d8.a    = sp.p8
JOIN d dfl      ON dfl.a   = sp.fl
ON CONFLICT (user_id, race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  status                = EXCLUDED.status,
  points_earned         = EXCLUDED.points_earned,
  submitted_at          = EXCLUDED.submitted_at;


-- ═══════════════════════════════════════════════════════════
-- SECTION 3 — CHAMPION PREDICTION (perfect match → 70 pts)
--
-- WDC=NOR ✓ (+20) + WCC=McLaren ✓ (+20)
-- Most DNFs=HAD ✓ (+10) + Most Podiums=NOR ✓ (+10) + Most Wins=NOR ✓ (+10)
-- ═══════════════════════════════════════════════════════════

INSERT INTO champion_predictions
  (user_id, season_id, wdc_driver_id, wcc_team_id,
   most_dnfs_driver_id, most_podiums_driver_id, most_wins_driver_id,
   wdc_correct, wcc_correct,
   status, is_half_points, points_earned, submitted_at)
VALUES (
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02',
  (SELECT id FROM seasons WHERE year = 2026),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM teams   WHERE name = 'McLaren'     AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  TRUE,   -- wdc_correct
  TRUE,   -- wcc_correct
  'scored',
  FALSE,  -- full points (pre-season)
  70,
  '2026-02-20T09:00:00+00:00'
)
ON CONFLICT (user_id, season_id) DO UPDATE SET
  wdc_driver_id          = EXCLUDED.wdc_driver_id,
  wcc_team_id            = EXCLUDED.wcc_team_id,
  most_dnfs_driver_id    = EXCLUDED.most_dnfs_driver_id,
  most_podiums_driver_id = EXCLUDED.most_podiums_driver_id,
  most_wins_driver_id    = EXCLUDED.most_wins_driver_id,
  wdc_correct            = EXCLUDED.wdc_correct,
  wcc_correct            = EXCLUDED.wcc_correct,
  status                 = EXCLUDED.status,
  is_half_points         = EXCLUDED.is_half_points,
  points_earned          = EXCLUDED.points_earned,
  submitted_at           = EXCLUDED.submitted_at;


-- ═══════════════════════════════════════════════════════════
-- SECTION 4 — TEAM BEST DRIVER PREDICTIONS (11 teams, all correct → 22 pts)
--
-- Each correct prediction = 2 pts × 11 teams = 22 pts
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
team_preds(team_name, driver_acr) AS (VALUES
  ('McLaren'::text,         'NOR'::text),
  ('Red Bull Racing',       'VER'),
  ('Mercedes',              'RUS'),
  ('Ferrari',               'LEC'),
  ('Williams',              'SAI'),
  ('Racing Bulls',          'LAW'),
  ('Aston Martin',          'ALO'),
  ('Haas',                  'BEA'),
  ('Audi',                  'HUL'),
  ('Alpine',                'GAS'),
  ('Cadillac',              'PER')
)
INSERT INTO team_best_driver_predictions
  (user_id, season_id, team_id, driver_id,
   is_half_points, status, points_earned, submitted_at)
SELECT
  '94f8aad2-fda9-4b4a-8b88-80a5ebb73b02'::uuid,
  (SELECT id FROM s),
  t.id,
  drv.id,
  FALSE,
  'scored',
  2,
  '2026-02-20T09:00:00+00:00'
FROM team_preds tp
JOIN teams t      ON t.name = tp.team_name            AND t.season_id = (SELECT id FROM s)
JOIN drivers drv  ON drv.name_acronym = tp.driver_acr  AND drv.season_id = (SELECT id FROM s)
ON CONFLICT (user_id, season_id, team_id) DO UPDATE SET
  driver_id      = EXCLUDED.driver_id,
  is_half_points = EXCLUDED.is_half_points,
  status         = EXCLUDED.status,
  points_earned  = EXCLUDED.points_earned,
  submitted_at   = EXCLUDED.submitted_at;


-- ─────────────────────────────────────────────────────────────
-- END OF PERFECT USER PREDICTIONS
--
-- Total points: 816 (races) + 140 (sprints) + 70 (champion) + 22 (team best) = 1048
-- ─────────────────────────────────────────────────────────────
