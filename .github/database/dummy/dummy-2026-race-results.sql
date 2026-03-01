-- ============================================================
-- F1 PREDICTION APP — RACE & SPRINT RESULTS (2026 Full Season)
-- ============================================================
--
-- PURPOSE:
--   Complete race results for all 24 rounds of the 2026 season
--   plus 2 sprint results (Rounds 2 and 6).
--   Designed to pair with dummy user prediction files.
--   Fully idempotent — safe to re-run at any time.
--
-- ──────────────────────────────────────────────────────────
--   SEASON OUTCOMES
-- ──────────────────────────────────────────────────────────
--   WDC: NOR (10 wins)    WCC: McLaren
--   Most Wins: NOR (10)   Most Podiums: NOR (24/24)
--   Most DNFs: HAD
--
-- ──────────────────────────────────────────────────────────
--   TEAM BEST DRIVERS (based on top-10 appearances)
-- ──────────────────────────────────────────────────────────
--   McLaren=NOR, Red Bull=VER, Mercedes=RUS, Ferrari=LEC,
--   Williams=SAI, Racing Bulls=LAW, Aston Martin=ALO,
--   Haas=BEA, Audi=HUL, Alpine=GAS, Cadillac=PER
--
-- ──────────────────────────────────────────────────────────
--   RACE RESULTS SUMMARY
-- ──────────────────────────────────────────────────────────
--   Rd1  AUS: pole=NOR P1=NOR P2=VER P3=PIA FL=VER FPS=NOR DOTD=NOR
--   Rd2  CHN: pole=PIA P1=PIA P2=NOR P3=VER FL=NOR FPS=PIA DOTD=PIA
--   Rd3  JPN: pole=VER P1=VER P2=NOR P3=PIA FL=VER FPS=NOR DOTD=VER
--   Rd4  BHR: pole=NOR P1=NOR P2=HAM P3=LEC FL=HAM FPS=NOR DOTD=HAM
--   Rd5  SAU: pole=NOR P1=NOR P2=PIA P3=RUS FL=NOR FPS=PIA DOTD=NOR
--   Rd6  MIA: pole=NOR P1=NOR P2=PIA P3=VER FL=NOR FPS=NOR DOTD=NOR
--   Rd7  CAN: pole=LEC P1=LEC P2=PIA P3=NOR FL=LEC FPS=PIA DOTD=LEC
--   Rd8  MON: pole=NOR P1=NOR P2=RUS P3=PIA FL=NOR FPS=PIA DOTD=RUS
--   Rd9  ESP: pole=VER P1=VER P2=NOR P3=HAM FL=VER FPS=NOR DOTD=VER
--   Rd10 AUT: pole=PIA P1=PIA P2=NOR P3=VER FL=PIA FPS=NOR DOTD=PIA
--   Rd11 GBR: pole=NOR P1=NOR P2=VER P3=RUS FL=NOR FPS=VER DOTD=NOR
--   Rd12 BEL: pole=RUS P1=RUS P2=NOR P3=PIA FL=RUS FPS=NOR DOTD=RUS
--   Rd13 HUN: pole=VER P1=VER P2=NOR P3=LEC FL=VER FPS=PIA DOTD=VER
--   Rd14 NED: pole=NOR P1=NOR P2=PIA P3=VER FL=NOR FPS=NOR DOTD=NOR
--   Rd15 ITA: pole=PIA P1=PIA P2=NOR P3=VER FL=PIA FPS=VER DOTD=PIA
--   Rd16 MAD: pole=NOR P1=NOR P2=VER P3=PIA FL=VER FPS=NOR DOTD=NOR
--   Rd17 AZE: pole=VER P1=VER P2=NOR P3=PIA FL=NOR FPS=VER DOTD=VER
--   Rd18 SGP: pole=LEC P1=LEC P2=NOR P3=HAM FL=LEC FPS=NOR DOTD=LEC
--   Rd19 USA: pole=RUS P1=RUS P2=NOR P3=VER FL=NOR FPS=RUS DOTD=RUS
--   Rd20 MEX: pole=NOR P1=NOR P2=PIA P3=VER FL=NOR FPS=PIA DOTD=NOR
--   Rd21 BRA: pole=PIA P1=PIA P2=NOR P3=VER FL=PIA FPS=NOR DOTD=PIA
--   Rd22 LAS: pole=VER P1=VER P2=NOR P3=PIA FL=VER FPS=NOR DOTD=VER
--   Rd23 QAT: pole=LEC P1=HAM P2=NOR P3=VER FL=HAM FPS=NOR DOTD=HAM
--   Rd24 ABU: pole=NOR P1=NOR P2=VER P3=PIA FL=NOR FPS=NOR DOTD=NOR
--
-- ──────────────────────────────────────────────────────────
--   SPRINT RESULTS
-- ──────────────────────────────────────────────────────────
--   Rd2s CHN: pole=VER top8=[VER,NOR,PIA,LEC,HAM,RUS,ANT,ALB] FL=NOR
--   Rd6s MIA: pole=PIA top8=[PIA,NOR,VER,LEC,HAM,RUS,ANT,SAI] FL=PIA
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 0 — CLEANUP
-- ─────────────────────────────────────────────────────────────

DELETE FROM race_results
WHERE race_id IN (
  SELECT id FROM races
  WHERE season_id = (SELECT id FROM seasons WHERE year = 2026)
);

DELETE FROM sprint_results
WHERE race_id IN (
  SELECT id FROM races
  WHERE season_id = (SELECT id FROM seasons WHERE year = 2026)
    AND has_sprint = TRUE
);


-- ═══════════════════════════════════════════════════════════
-- SECTION 1 — RACE RESULTS (All 24 rounds)
--
-- Uses a compact CTE: one row per round with driver acronyms,
-- then joins to resolve IDs and builds the JSONB top_10 array.
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
d AS (SELECT name_acronym AS a, id FROM drivers WHERE season_id = (SELECT id FROM s)),
race_data(rnd, pole, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, fl, fps, dotd) AS (VALUES
  --     pole   P1     P2     P3     P4     P5     P6     P7     P8     P9     P10    FL     FPS    DOTD
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
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10,
   fastest_lap_driver_id, fastest_pit_stop_driver_id,
   driver_of_the_day_driver_id, source)
SELECT
  r.id,
  dpole.id,
  jsonb_build_array(d1.id, d2.id, d3.id, d4.id, d5.id,
                    d6.id, d7.id, d8.id, d9.id, d10.id),
  dfl.id,
  dfps.id,
  ddotd.id,
  'manual'
FROM race_data rd
JOIN races r    ON r.round = rd.rnd AND r.season_id = (SELECT id FROM s)
JOIN d dpole    ON dpole.a = rd.pole
JOIN d d1       ON d1.a    = rd.p1
JOIN d d2       ON d2.a    = rd.p2
JOIN d d3       ON d3.a    = rd.p3
JOIN d d4       ON d4.a    = rd.p4
JOIN d d5       ON d5.a    = rd.p5
JOIN d d6       ON d6.a    = rd.p6
JOIN d d7       ON d7.a    = rd.p7
JOIN d d8       ON d8.a    = rd.p8
JOIN d d9       ON d9.a    = rd.p9
JOIN d d10      ON d10.a   = rd.p10
JOIN d dfl      ON dfl.a   = rd.fl
JOIN d dfps     ON dfps.a  = rd.fps
JOIN d ddotd    ON ddotd.a = rd.dotd
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id     = EXCLUDED.pole_position_driver_id,
  top_10                      = EXCLUDED.top_10,
  fastest_lap_driver_id       = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id  = EXCLUDED.fastest_pit_stop_driver_id,
  driver_of_the_day_driver_id = EXCLUDED.driver_of_the_day_driver_id,
  source                      = EXCLUDED.source;


-- ═══════════════════════════════════════════════════════════
-- SECTION 2 — SPRINT RESULTS (Rounds 2 and 6 only)
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
d AS (SELECT name_acronym AS a, id FROM drivers WHERE season_id = (SELECT id FROM s)),
sprint_data(rnd, pole, p1, p2, p3, p4, p5, p6, p7, p8, fl) AS (VALUES
  --     pole   P1     P2     P3     P4     P5     P6     P7     P8     FL
  (2::int, 'VER'::text,'VER'::text,'NOR'::text,'PIA'::text,'LEC'::text,'HAM'::text,'RUS'::text,'ANT'::text,'ALB'::text,'NOR'::text),
  (6,      'PIA',      'PIA',      'NOR',      'VER',      'LEC',      'HAM',      'RUS',      'ANT',      'SAI',      'PIA')
)
INSERT INTO sprint_results
  (race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id, source)
SELECT
  r.id,
  dpole.id,
  jsonb_build_array(d1.id, d2.id, d3.id, d4.id, d5.id, d6.id, d7.id, d8.id),
  dfl.id,
  'manual'
FROM sprint_data sd
JOIN races r    ON r.round = sd.rnd AND r.season_id = (SELECT id FROM s)
JOIN d dpole    ON dpole.a = sd.pole
JOIN d d1       ON d1.a    = sd.p1
JOIN d d2       ON d2.a    = sd.p2
JOIN d d3       ON d3.a    = sd.p3
JOIN d d4       ON d4.a    = sd.p4
JOIN d d5       ON d5.a    = sd.p5
JOIN d d6       ON d6.a    = sd.p6
JOIN d d7       ON d7.a    = sd.p7
JOIN d d8       ON d8.a    = sd.p8
JOIN d dfl      ON dfl.a   = sd.fl
ON CONFLICT (race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  source                = EXCLUDED.source;


-- ─────────────────────────────────────────────────────────────
-- END OF RACE & SPRINT RESULTS DATA
-- ─────────────────────────────────────────────────────────────
