-- ============================================================
-- F1 PREDICTION APP — MIXED USER PREDICTIONS (2026)
-- ============================================================
--
-- USER: 3e6ef1a7-2ab5-4412-87db-02715a7bda0a
--
-- PURPOSE:
--   Realistic "normal user" predictions — some correct, some wrong.
--   Serves as a test for partial scoring and typical achievement
--   earning patterns. Depends on dummy-2026-race-results.sql and
--   dummy-2026-champion-results.sql being loaded first.
--
-- ──────────────────────────────────────────────────────────
--   PREDICTION STRATEGY
-- ──────────────────────────────────────────────────────────
--   - Always predicts NOR for pole, FL, and DOTD
--   - Always predicts PIA for fastest pit stop
--   - Positions: P1/P2 swapped from actual result in most races
--     (Pattern A — 20 races), with top 10 more shuffled in 4
--     difficult rounds (Pattern B — rounds 12, 18, 22, 23)
--
-- ──────────────────────────────────────────────────────────
--   SCORING SUMMARY
-- ──────────────────────────────────────────────────────────
--   Pattern A scoring (20 races):
--     8 position matches + matchPodium(5) + matchTop10(5)
--     + variable bonuses (pole/FL/FPS/DOTD) = 18–22 pts
--
--   Pattern B scoring (4 races: Rd12, Rd18, Rd22, Rd23):
--     5-6 position matches + matchTop10(5) = 10–11 pts
--
--   Race total:     437 pts
--   Sprint total:    75 pts  (Rd2=11, Rd6=10, Rd7=11, Rd11=11, Rd14=11, Rd18=11, Rd23=10)
--   Champion:        30 pts  (WCC=20 + MostDNFs=10)
--   Team best:       12 pts  (6 correct × 2)
--   ─────────────────────────
--   Grand total:    554 pts
--
-- ──────────────────────────────────────────────────────────
--   PER-RACE POINTS
-- ──────────────────────────────────────────────────────────
--   Rd1=20  Rd2=20   Rd3=18  Rd4=19  Rd5=22  Rd6=21
--   Rd7=19  Rd8=21   Rd9=18  Rd10=18 Rd11=21 Rd12=11
--   Rd13=19 Rd14=21  Rd15=18 Rd16=20 Rd17=19 Rd18=10
--   Rd19=19 Rd20=22  Rd21=18 Rd22=11 Rd23=11 Rd24=21
--   Sprint Rd2=11  Sprint Rd6=10  Sprint Rd7=11
--   Sprint Rd11=11  Sprint Rd14=11  Sprint Rd18=11  Sprint Rd23=10
--
-- ──────────────────────────────────────────────────────────
--   CHAMPION PREDICTION DETAIL
-- ──────────────────────────────────────────────────────────
--   WDC=VER ✗ (actual NOR)     WCC=McLaren ✓ (+20)
--   Most DNFs=HAD ✓ (+10)      Most Podiums=VER ✗
--   Most Wins=VER ✗            Total = 30
--
-- ──────────────────────────────────────────────────────────
--   TEAM BEST DRIVER PREDICTIONS
-- ──────────────────────────────────────────────────────────
--   McLaren=NOR ✓  Red Bull=VER ✓  Mercedes=RUS ✓
--   Ferrari=LEC ✓  Williams=ALB ✗  Racing Bulls=LAW ✓
--   Aston Martin=ALO ✓  Haas=OCO ✗  Audi=BOR ✗
--   Alpine=COL ✗  Cadillac=BOT ✗
--   6 correct × 2 = 12
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 0 — CLEANUP
-- ─────────────────────────────────────────────────────────────

DELETE FROM race_predictions
  WHERE user_id = '3e6ef1a7-2ab5-4412-87db-02715a7bda0a';

DELETE FROM sprint_predictions
  WHERE user_id = '3e6ef1a7-2ab5-4412-87db-02715a7bda0a';

DELETE FROM champion_predictions
  WHERE user_id = '3e6ef1a7-2ab5-4412-87db-02715a7bda0a';

DELETE FROM team_best_driver_predictions
  WHERE user_id = '3e6ef1a7-2ab5-4412-87db-02715a7bda0a';

DELETE FROM leaderboard
  WHERE user_id = '3e6ef1a7-2ab5-4412-87db-02715a7bda0a';

DELETE FROM user_achievements
  WHERE user_id = '3e6ef1a7-2ab5-4412-87db-02715a7bda0a';


-- ═══════════════════════════════════════════════════════════
-- SECTION 1 — RACE PREDICTIONS (24 rounds — mixed accuracy)
--
-- Pattern A (20 races): P1/P2 swapped, P3-P10 correct
--   pole=NOR  FL=NOR  FPS=PIA  DOTD=NOR
--   → 8 pos + matchPodium(5) + matchTop10(5) + bonuses
--
-- Pattern B (Rd12,18,22,23): top 10 more shuffled
--   pole=NOR  FL=NOR  FPS=PIA  DOTD=NOR
--   → 5-6 pos + matchTop10(5)
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
d AS (SELECT name_acronym AS a, id FROM drivers WHERE season_id = (SELECT id FROM s)),
pred_data(rnd, pole, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, fl, fps, dotd, pts) AS (VALUES
  -- Pattern A: P1/P2 swapped from result
  -- Rd1 actual=[NOR,VER,PIA...] → pred=[VER,NOR,PIA...]  pole✓  DOTD✓  → 20 pts
  ( 1::int, 'NOR'::text,'VER'::text,'NOR'::text,'PIA'::text,'RUS'::text,'LEC'::text,'HAM'::text,'ANT'::text,'ALB'::text,'SAI'::text,'GAS'::text,'NOR'::text,'PIA'::text,'NOR'::text, 20::int),
  -- Rd2 actual=[PIA,NOR,VER...]  FL✓ FPS✓  → 20 pts
  ( 2, 'NOR','NOR','PIA','VER','LEC','RUS','HAM','ANT','SAI','ALB','ALO','NOR','PIA','NOR', 20),
  -- Rd3 actual=[VER,NOR,PIA...]  → 18 pts
  ( 3, 'NOR','NOR','VER','PIA','HAM','LEC','RUS','ANT','SAI','ALB','HUL','NOR','PIA','NOR', 18),
  -- Rd4 actual=[NOR,HAM,LEC...]  pole✓  → 19 pts
  ( 4, 'NOR','HAM','NOR','LEC','PIA','RUS','VER','ANT','SAI','ALB','GAS','NOR','PIA','NOR', 19),
  -- Rd5 actual=[NOR,PIA,RUS...]  pole✓ FL✓ FPS✓ DOTD✓  → 22 pts
  ( 5, 'NOR','PIA','NOR','RUS','VER','LEC','HAM','ANT','SAI','ALB','HAD','NOR','PIA','NOR', 22),
  -- Rd6 actual=[NOR,PIA,VER...]  pole✓ FL✓ DOTD✓  → 21 pts
  ( 6, 'NOR','PIA','NOR','VER','RUS','LEC','HAM','ANT','ALB','SAI','ALO','NOR','PIA','NOR', 21),
  -- Rd7 actual=[LEC,PIA,NOR...]  FPS✓  → 19 pts
  ( 7, 'NOR','PIA','LEC','NOR','VER','RUS','HAM','ANT','SAI','ALB','ALO','NOR','PIA','NOR', 19),
  -- Rd8 actual=[NOR,RUS,PIA...]  pole✓ FL✓ FPS✓  → 21 pts
  ( 8, 'NOR','RUS','NOR','PIA','LEC','VER','HAM','ANT','ALB','GAS','SAI','NOR','PIA','NOR', 21),
  -- Rd9 actual=[VER,NOR,HAM...]  → 18 pts
  ( 9, 'NOR','NOR','VER','HAM','PIA','LEC','RUS','ANT','SAI','GAS','HUL','NOR','PIA','NOR', 18),
  -- Rd10 actual=[PIA,NOR,VER...]  → 18 pts
  (10, 'NOR','NOR','PIA','VER','RUS','LEC','HAM','ANT','SAI','ALB','HAD','NOR','PIA','NOR', 18),
  -- Rd11 actual=[NOR,VER,RUS...]  pole✓ FL✓ DOTD✓  → 21 pts
  (11, 'NOR','VER','NOR','RUS','PIA','HAM','LEC','ANT','ALB','SAI','LAW','NOR','PIA','NOR', 21),

  -- Pattern B: Rd12 — top 10 more shuffled → 11 pts
  -- actual=[RUS,NOR,PIA,VER,LEC,HAM,ANT,SAI,ALB,BEA]
  -- pos: P3✓ P5✓ P7✓ P8✓ P9✓ P10✓ = 6, matchTop10=5 → 11
  (12, 'NOR','NOR','VER','PIA','HAM','LEC','RUS','ANT','SAI','ALB','BEA','NOR','PIA','NOR', 11),

  -- Pattern A continues
  -- Rd13 actual=[VER,NOR,LEC...]  FPS✓  → 19 pts
  (13, 'NOR','NOR','VER','LEC','PIA','RUS','HAM','ANT','ALB','HUL','SAI','NOR','PIA','NOR', 19),
  -- Rd14 actual=[NOR,PIA,VER...]  pole✓ FL✓ DOTD✓  → 21 pts
  (14, 'NOR','PIA','NOR','VER','LEC','RUS','HAM','ALB','ANT','GAS','ALO','NOR','PIA','NOR', 21),
  -- Rd15 actual=[PIA,NOR,VER...]  → 18 pts
  (15, 'NOR','NOR','PIA','VER','HAM','RUS','LEC','ANT','SAI','ALB','OCO','NOR','PIA','NOR', 18),
  -- Rd16 actual=[NOR,VER,PIA...]  pole✓ DOTD✓  → 20 pts
  (16, 'NOR','VER','NOR','PIA','RUS','HAM','LEC','ANT','ALB','SAI','STR','NOR','PIA','NOR', 20),
  -- Rd17 actual=[VER,NOR,PIA...]  FL✓  → 19 pts
  (17, 'NOR','NOR','VER','PIA','LEC','HAM','RUS','SAI','ANT','ALB','GAS','NOR','PIA','NOR', 19),

  -- Pattern B: Rd18 — top 10 more shuffled → 10 pts
  -- actual=[LEC,NOR,HAM,PIA,VER,RUS,ANT,SAI,ALB,BOR]
  -- pos: P6✓ P7✓ P8✓ P9✓ P10✓ = 5, matchTop10=5 → 10
  (18, 'NOR','NOR','VER','PIA','HAM','LEC','RUS','ANT','SAI','ALB','BOR','NOR','PIA','NOR', 10),

  -- Pattern A continues
  -- Rd19 actual=[RUS,NOR,VER...]  FL✓  → 19 pts
  (19, 'NOR','NOR','RUS','VER','PIA','LEC','HAM','ANT','ALB','SAI','LAW','NOR','PIA','NOR', 19),
  -- Rd20 actual=[NOR,PIA,VER...]  pole✓ FL✓ FPS✓ DOTD✓  → 22 pts
  (20, 'NOR','PIA','NOR','VER','HAM','RUS','LEC','ANT','SAI','ALO','ALB','NOR','PIA','NOR', 22),
  -- Rd21 actual=[PIA,NOR,VER...]  → 18 pts
  (21, 'NOR','NOR','PIA','VER','RUS','HAM','LEC','ANT','ALB','SAI','HUL','NOR','PIA','NOR', 18),

  -- Pattern B: Rd22 — top 10 more shuffled → 11 pts
  -- actual=[VER,NOR,PIA,LEC,RUS,HAM,ANT,SAI,ALB,GAS]
  -- pos: P4✓ P5✓ P7✓ P8✓ P9✓ P10✓ = 6, matchTop10=5 → 11
  (22, 'NOR','NOR','VER','HAM','LEC','RUS','PIA','ANT','SAI','ALB','GAS','NOR','PIA','NOR', 11),

  -- Pattern B: Rd23 — top 10 more shuffled → 11 pts
  -- actual=[HAM,NOR,VER,PIA,LEC,RUS,ANT,SAI,ALB,PER]
  -- pos: P5✓ P6✓ P7✓ P8✓ P9✓ P10✓ = 6, matchTop10=5 → 11
  (23, 'NOR','NOR','VER','PIA','HAM','LEC','RUS','ANT','SAI','ALB','PER','NOR','PIA','NOR', 11),

  -- Pattern A
  -- Rd24 actual=[NOR,VER,PIA...]  pole✓ FL✓ DOTD✓  → 21 pts
  (24, 'NOR','VER','NOR','PIA','RUS','LEC','HAM','ANT','ALB','SAI','GAS','NOR','PIA','NOR', 21)
)
INSERT INTO race_predictions
  (user_id, race_id, pole_position_driver_id, top_10,
   fastest_lap_driver_id, fastest_pit_stop_driver_id,
   driver_of_the_day_driver_id,
   status, points_earned, submitted_at)
SELECT
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a'::uuid,
  r.id,
  dpole.id,
  jsonb_build_array(d1.id, d2.id, d3.id, d4.id, d5.id,
                    d6.id, d7.id, d8.id, d9.id, d10.id),
  dfl.id,
  dfps.id,
  ddotd.id,
  'scored',
  pd.pts,
  r.date_start - interval '1 day'
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
-- SECTION 2 — SPRINT PREDICTIONS (7 sprint rounds — P1/P2 swapped)
--
-- Sprint Rd2: actual=[VER,NOR,PIA,...] pred=[NOR,VER,PIA,...]
--   pos=6 + FL✓(1) + matchPod(2) + matchTop8(2) = 11
--
-- Sprint Rd6: actual=[PIA,NOR,VER,...] pred=[NOR,PIA,VER,...]
--   pos=6 + matchPod(2) + matchTop8(2) = 10
--
-- Sprint Rd7: actual=[NOR,LEC,PIA,...] pred=[LEC,NOR,PIA,...]
--   pos=6 + pole✓(1) + matchPod(2) + matchTop8(2) = 11
--
-- Sprint Rd11: actual=[VER,NOR,RUS,...] pred=[NOR,VER,RUS,...]
--   pos=6 + FL✓(1) + matchPod(2) + matchTop8(2) = 11
--
-- Sprint Rd14: actual=[PIA,NOR,VER,...] pred=[NOR,PIA,VER,...]
--   pos=6 + FL✓(1) + matchPod(2) + matchTop8(2) = 11
--
-- Sprint Rd18: actual=[LEC,NOR,HAM,...] pred=[NOR,LEC,HAM,...]
--   pos=6 + FL✓(1) + matchPod(2) + matchTop8(2) = 11
--
-- Sprint Rd23: actual=[VER,NOR,HAM,...] pred=[NOR,VER,HAM,...]
--   pos=6 + matchPod(2) + matchTop8(2) = 10
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
d AS (SELECT name_acronym AS a, id FROM drivers WHERE season_id = (SELECT id FROM s)),
sprint_pred(rnd, pole, p1, p2, p3, p4, p5, p6, p7, p8, fl, pts) AS (VALUES
  -- Rd2 sprint: P1/P2 swapped  FL✓  → 11 pts
  (2::int, 'NOR'::text,'NOR'::text,'VER'::text,'PIA'::text,'LEC'::text,'HAM'::text,'RUS'::text,'ANT'::text,'ALB'::text,'NOR'::text, 11::int),
  -- Rd6 sprint: P1/P2 swapped  → 10 pts
  (6,      'NOR',      'NOR',      'PIA',      'VER',      'LEC',      'HAM',      'RUS',      'ANT',      'SAI',      'NOR',       10),
  -- Rd7 sprint: P1/P2 swapped  pole✓  → 11 pts
  (7,      'NOR',      'LEC',      'NOR',      'PIA',      'VER',      'RUS',      'HAM',      'ANT',      'SAI',      'NOR',       11),
  -- Rd11 sprint: P1/P2 swapped  FL✓  → 11 pts
  (11,     'NOR',      'NOR',      'VER',      'RUS',      'PIA',      'HAM',      'LEC',      'ANT',      'ALB',      'NOR',       11),
  -- Rd14 sprint: P1/P2 swapped  FL✓  → 11 pts
  (14,     'NOR',      'NOR',      'PIA',      'VER',      'LEC',      'RUS',      'HAM',      'ALB',      'ANT',      'NOR',       11),
  -- Rd18 sprint: P1/P2 swapped  FL✓  → 11 pts
  (18,     'NOR',      'NOR',      'LEC',      'HAM',      'PIA',      'VER',      'RUS',      'ANT',      'SAI',      'NOR',       11),
  -- Rd23 sprint: P1/P2 swapped  → 10 pts
  (23,     'NOR',      'NOR',      'VER',      'HAM',      'PIA',      'LEC',      'RUS',      'ANT',      'SAI',      'NOR',       10)
)
INSERT INTO sprint_predictions
  (user_id, race_id, sprint_pole_driver_id, top_8,
   fastest_lap_driver_id,
   status, points_earned, submitted_at)
SELECT
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a'::uuid,
  r.id,
  dpole.id,
  jsonb_build_array(d1.id, d2.id, d3.id, d4.id, d5.id, d6.id, d7.id, d8.id),
  dfl.id,
  'scored',
  sp.pts,
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
-- SECTION 3 — CHAMPION PREDICTION (partial match → 30 pts)
--
-- WDC=VER ✗       WCC=McLaren ✓ (+20)
-- Most DNFs=HAD ✓ (+10)  Most Podiums=VER ✗  Most Wins=VER ✗
-- ═══════════════════════════════════════════════════════════

INSERT INTO champion_predictions
  (user_id, season_id, wdc_driver_id, wcc_team_id,
   most_dnfs_driver_id, most_podiums_driver_id, most_wins_driver_id,
   wdc_correct, wcc_correct,
   status, is_half_points, points_earned, submitted_at)
VALUES (
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a',
  (SELECT id FROM seasons WHERE year = 2026),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM teams   WHERE name = 'McLaren'     AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  FALSE,  -- wdc_correct
  TRUE,   -- wcc_correct
  'scored',
  FALSE,  -- full points (pre-season)
  30,
  '2026-02-21T11:00:00+00:00'
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
-- SECTION 4 — TEAM BEST DRIVER PREDICTIONS (6/11 correct → 12 pts)
--
-- ✓ McLaren=NOR  ✓ Red Bull=VER  ✓ Mercedes=RUS  ✓ Ferrari=LEC
-- ✗ Williams=ALB (actual=SAI)     ✓ Racing Bulls=LAW
-- ✓ Aston Martin=ALO              ✗ Haas=OCO (actual=BEA)
-- ✗ Audi=BOR (actual=HUL)         ✗ Alpine=COL (actual=GAS)
-- ✗ Cadillac=BOT (actual=PER)
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
team_preds(team_name, driver_acr, pts) AS (VALUES
  ('McLaren'::text,         'NOR'::text, 2::int),    -- ✓
  ('Red Bull Racing',       'VER',       2),          -- ✓
  ('Mercedes',              'RUS',       2),          -- ✓
  ('Ferrari',               'LEC',       2),          -- ✓
  ('Williams',              'ALB',       0),          -- ✗ actual=SAI
  ('Racing Bulls',          'LAW',       2),          -- ✓
  ('Aston Martin',          'ALO',       2),          -- ✓
  ('Haas',                  'OCO',       0),          -- ✗ actual=BEA
  ('Audi',                  'BOR',       0),          -- ✗ actual=HUL
  ('Alpine',                'COL',       0),          -- ✗ actual=GAS
  ('Cadillac',              'BOT',       0)           -- ✗ actual=PER
)
INSERT INTO team_best_driver_predictions
  (user_id, season_id, team_id, driver_id,
   is_half_points, status, points_earned, submitted_at)
SELECT
  '3e6ef1a7-2ab5-4412-87db-02715a7bda0a'::uuid,
  (SELECT id FROM s),
  t.id,
  drv.id,
  FALSE,
  'scored',
  tp.pts,
  '2026-02-21T11:00:00+00:00'
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
-- END OF MIXED USER PREDICTIONS
--
-- Total: 437 (races) + 75 (sprints) + 30 (champion) + 12 (team best) = 554 pts
-- ─────────────────────────────────────────────────────────────
