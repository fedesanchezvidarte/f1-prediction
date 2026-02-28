-- ============================================================
-- F1 PREDICTION APP — RACE & SPRINT RESULTS (2026 Full Season)
-- ============================================================
--
-- PURPOSE:
--   Standalone results dataset for the full 2026 season (Rounds 1–24).
--   Designed to pair with 2026-champion-prediction-test-data.sql:
--   importing this file gives the deterministic results against
--   which all predictions in that file are scored.
--
--   Using ON CONFLICT (race_id) DO UPDATE makes this file fully
--   idempotent — safe to re-run at any time.
--
-- ──────────────────────────────────────────────────────────
--   ROUNDS & RESULTS
-- ──────────────────────────────────────────────────────────
--   Full calendar inserted (Rounds 1–24)
--   Sprint rounds inserted: 2, 6, 10, 19, 21, 23
--
-- ──────────────────────────────────────────────────────────
--   SEASON WINNER (for champion_predictions scoring)
-- ──────────────────────────────────────────────────────────
--   WDC: NOR   WCC: McLaren
--
-- ──────────────────────────────────────────────────────────
--   RESULTS SUMMARY
-- ──────────────────────────────────────────────────────────
--   Rd1r: pole=NOR  top10=[NOR,VER,PIA,RUS,LEC,HAM,ANT,ALB,SAI,GAS]  FL=VER  FPS=NOR
--   Rd2r: pole=PIA  top10=[PIA,NOR,VER,LEC,RUS,HAM,ANT,SAI,ALB,ALO]  FL=NOR  FPS=PIA
--   Rd2s: pole=VER  top8=[VER,NOR,PIA,LEC,HAM,RUS,ANT,ALB]            FL=NOR
--   Rd3r: pole=VER  top10=[VER,NOR,PIA,HAM,LEC,RUS,ANT,SAI,ALB,HUL]  FL=VER  FPS=NOR
--   Rd4r: pole=NOR  top10=[NOR,HAM,LEC,PIA,RUS,VER,ANT,SAI,ALB,GAS]  FL=HAM  FPS=NOR
--   Rd5r: pole=NOR  top10=[NOR,PIA,RUS,VER,LEC,HAM,ANT,SAI,ALB,HAD]  FL=NOR  FPS=PIA
--   Rd6r: pole=NOR  top10=[NOR,PIA,VER,RUS,LEC,HAM,ANT,ALB,SAI,ALO]  FL=NOR  FPS=NOR
--   Rd6s: pole=PIA  top8=[PIA,NOR,VER,LEC,HAM,RUS,ANT,SAI]            FL=PIA
--   Rd7r: pole=LEC  top10=[LEC,PIA,NOR,VER,RUS,HAM,ANT,SAI,ALB,ALO]  FL=LEC  FPS=PIA
--   Rd8r: pole=NOR  top10=[NOR,RUS,PIA,LEC,VER,HAM,ANT,ALB,GAS,SAI]  FL=NOR  FPS=PIA
--   Rd9r: pole=VER  top10=[VER,NOR,HAM,PIA,LEC,RUS,ANT,SAI,GAS,HUL]  FL=VER  FPS=NOR
--   Rd10r: pole=PIA  top10=[PIA,NOR,VER,RUS,LEC,HAM,ANT,SAI,ALB,HAD] FL=PIA  FPS=NOR
--   Rd10s: pole=VER  top8=[VER,NOR,PIA,HAM,LEC,RUS,ANT,SAI]           FL=NOR
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 0 — CLEANUP
-- Delete existing results for the full 2026 season so this file is fully
-- idempotent / rerunnable.
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
-- SECTION 1 — RACE RESULTS
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- Rd1 — AUSTRALIAN GRAND PRIX  (round = 1)
-- pole=NOR  top10=[NOR,VER,PIA,RUS,LEC,HAM,ANT,ALB,SAI,GAS]  FL=VER  FPS=NOR
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
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
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd2 — CHINESE GRAND PRIX  (round = 2, race)
-- pole=PIA  top10=[PIA,NOR,VER,LEC,RUS,HAM,ANT,SAI,ALB,ALO]  FL=NOR  FPS=PIA
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
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
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd3 — JAPANESE GRAND PRIX  (round = 3)
-- pole=VER  top10=[VER,NOR,PIA,HAM,LEC,RUS,ANT,SAI,ALB,HUL]  FL=VER  FPS=NOR
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
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
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd4 — BAHRAIN GRAND PRIX  (round = 4)
-- pole=NOR  top10=[NOR,HAM,LEC,PIA,RUS,VER,ANT,SAI,ALB,GAS]  FL=HAM  FPS=NOR
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
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
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd5 — SAUDI ARABIAN GRAND PRIX  (round = 5)
-- pole=NOR  top10=[NOR,PIA,RUS,VER,LEC,HAM,ANT,SAI,ALB,HAD]  FL=NOR  FPS=PIA
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
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
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd6 — MIAMI GRAND PRIX  (round = 6, race)
-- pole=NOR  top10=[NOR,PIA,VER,RUS,LEC,HAM,ANT,ALB,SAI,ALO]  FL=NOR  FPS=NOR
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
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
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ═══════════════════════════════════════════════════════════
-- SECTION 2 — SPRINT RESULTS  (Rounds 2 and 6)
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- Rd2 SPRINT — CHINESE GRAND PRIX  (round = 2)
-- pole=VER  top8=[VER,NOR,PIA,LEC,HAM,RUS,ANT,ALB]  FL=NOR
-- ───────────────────────────────────────────────────────────
INSERT INTO sprint_results
  (race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id, source)
VALUES (
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
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  source                = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd6 SPRINT — MIAMI GRAND PRIX  (round = 6)
-- pole=PIA  top8=[PIA,NOR,VER,LEC,HAM,RUS,ANT,SAI]  FL=PIA
-- ───────────────────────────────────────────────────────────
INSERT INTO sprint_results
  (race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id, source)
VALUES (
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
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  source                = EXCLUDED.source;


-- ─────────────────────────────────────────────────────────────
-- SECTION 3 — RACE RESULTS (Rounds 7–24)
--
-- Compact deterministic generation based on a fixed driver acronym
-- order plus round-based rotation.
-- ─────────────────────────────────────────────────────────────

WITH season_ctx AS (
  SELECT id AS season_id FROM seasons WHERE year = 2026
), driver_order AS (
  SELECT d.id,
         a.acr,
         (a.ord - 1) AS idx
  FROM season_ctx s
  JOIN (
    SELECT *
    FROM unnest(ARRAY[
      'NOR','VER','PIA','RUS','LEC','HAM','ANT','ALB','SAI','ALO','HUL',
      'HAD','BEA','LAW','OCO','STR','GAS','BOR','COL','PER','BOT','LIN'
    ]) WITH ORDINALITY AS t(acr, ord)
  ) a ON TRUE
  JOIN drivers d
    ON d.season_id = s.season_id
   AND d.name_acronym = a.acr
), round_rows AS (
  SELECT r.id AS race_id,
         r.round,
         ((r.round * 2) % 22) AS start_idx
  FROM races r
  JOIN season_ctx s ON r.season_id = s.season_id
  WHERE r.round BETWEEN 7 AND 24
)
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
SELECT
  rr.race_id,
  (
    SELECT d.id
    FROM driver_order d
    WHERE d.idx = ((rr.start_idx + (rr.round % 3)) % 22)
  ) AS pole_driver_id,
  (
    SELECT jsonb_agg(d.id ORDER BY offs)
    FROM generate_series(0, 9) AS offs
    JOIN driver_order d
      ON d.idx = ((rr.start_idx + offs) % 22)
  ) AS top_10,
  (
    SELECT d.id
    FROM driver_order d
    WHERE d.idx = ((rr.start_idx + ((rr.round + 1) % 5)) % 22)
  ) AS fastest_lap_driver_id,
  (
    SELECT d.id
    FROM driver_order d
    WHERE d.idx = ((rr.start_idx + ((rr.round + 2) % 6)) % 22)
  ) AS fastest_pit_stop_driver_id,
  'manual' AS source
FROM round_rows rr
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ─────────────────────────────────────────────────────────────
-- SECTION 4 — SPRINT RESULTS (Rounds 10, 19, 21, 23)
--
-- Derived from the same rotated order:
--   top8 = [offset1, offset0, offset2, offset3, offset4, offset5, offset6, offset7]
--   pole = top8[0], fastest lap = top8[2]
-- ─────────────────────────────────────────────────────────────

WITH season_ctx AS (
  SELECT id AS season_id FROM seasons WHERE year = 2026
), driver_order AS (
  SELECT d.id,
         a.acr,
         (a.ord - 1) AS idx
  FROM season_ctx s
  JOIN (
    SELECT *
    FROM unnest(ARRAY[
      'NOR','VER','PIA','RUS','LEC','HAM','ANT','ALB','SAI','ALO','HUL',
      'HAD','BEA','LAW','OCO','STR','GAS','BOR','COL','PER','BOT','LIN'
    ]) WITH ORDINALITY AS t(acr, ord)
  ) a ON TRUE
  JOIN drivers d
    ON d.season_id = s.season_id
   AND d.name_acronym = a.acr
), sprint_round_rows AS (
  SELECT r.id AS race_id,
         r.round,
         ((r.round * 2) % 22) AS start_idx
  FROM races r
  JOIN season_ctx s ON r.season_id = s.season_id
  WHERE r.round IN (10, 19, 21, 23)
)
INSERT INTO sprint_results
  (race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id, source)
SELECT
  rr.race_id,
  (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 1) % 22)) AS sprint_pole_driver_id,
  jsonb_build_array(
    (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 1) % 22)),
    (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 0) % 22)),
    (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 2) % 22)),
    (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 3) % 22)),
    (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 4) % 22)),
    (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 5) % 22)),
    (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 6) % 22)),
    (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 7) % 22))
  ) AS top_8,
  (SELECT d.id FROM driver_order d WHERE d.idx = ((rr.start_idx + 2) % 22)) AS fastest_lap_driver_id,
  'manual' AS source
FROM sprint_round_rows rr
ON CONFLICT (race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  source                = EXCLUDED.source;


-- ═══════════════════════════════════════════════════════════
-- SECTION 5 — EXPLICIT RESULTS (Rounds 7–10)
--
-- These explicit inserts override the CTE results for Rounds 7–10,
-- providing human-readable named results for specific GP weekends.
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- Rd7 — MONACO GRAND PRIX  (round = 7)
-- pole=LEC  top10=[LEC,PIA,NOR,VER,RUS,HAM,ANT,SAI,ALB,ALO]  FL=LEC  FPS=PIA
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
  (SELECT id FROM races WHERE round = 7 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALO' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd8 — SPANISH GRAND PRIX  (round = 8)
-- pole=NOR  top10=[NOR,RUS,PIA,LEC,VER,HAM,ANT,ALB,GAS,SAI]  FL=NOR  FPS=PIA
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
  (SELECT id FROM races WHERE round = 8 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd9 — CANADIAN GRAND PRIX  (round = 9)
-- pole=VER  top10=[VER,NOR,HAM,PIA,LEC,RUS,ANT,SAI,GAS,HUL]  FL=VER  FPS=NOR
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
  (SELECT id FROM races WHERE round = 9 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'GAS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HUL' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd10 — AUSTRIAN GRAND PRIX  (round = 10, race)
-- pole=PIA  top10=[PIA,NOR,VER,RUS,LEC,HAM,ANT,SAI,ALB,HAD]  FL=PIA  FPS=NOR
-- ───────────────────────────────────────────────────────────
INSERT INTO race_results
  (race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, source)
VALUES (
  (SELECT id FROM races WHERE round = 10 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ALB' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  pole_position_driver_id    = EXCLUDED.pole_position_driver_id,
  top_10                     = EXCLUDED.top_10,
  fastest_lap_driver_id      = EXCLUDED.fastest_lap_driver_id,
  fastest_pit_stop_driver_id = EXCLUDED.fastest_pit_stop_driver_id,
  source                     = EXCLUDED.source;


-- ───────────────────────────────────────────────────────────
-- Rd10 SPRINT — AUSTRIAN GRAND PRIX  (round = 10)
-- pole=VER  top8=[VER,NOR,PIA,HAM,LEC,RUS,ANT,SAI]  FL=NOR
-- ───────────────────────────────────────────────────────────
INSERT INTO sprint_results
  (race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id, source)
VALUES (
  (SELECT id FROM races WHERE round = 10 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  jsonb_build_array(
    (SELECT id FROM drivers WHERE name_acronym = 'VER' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'PIA' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'HAM' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'LEC' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'RUS' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'ANT' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
    (SELECT id FROM drivers WHERE name_acronym = 'SAI' AND season_id = (SELECT id FROM seasons WHERE year = 2026))
  ),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'manual'
)
ON CONFLICT (race_id) DO UPDATE SET
  sprint_pole_driver_id = EXCLUDED.sprint_pole_driver_id,
  top_8                 = EXCLUDED.top_8,
  fastest_lap_driver_id = EXCLUDED.fastest_lap_driver_id,
  source                = EXCLUDED.source;


-- ─────────────────────────────────────────────────────────────
-- END OF RACE RESULTS DATA
-- ─────────────────────────────────────────────────────────────
--
-- After importing this file, trigger scoring from the admin panel
-- (or POST /api/results/score) to recompute points_earned for
-- all predictions that have status = 'submitted'.
--
-- If predictions were already inserted with pre-computed scores
-- (status = 'scored', points_earned = N) via
-- 2026-champion-prediction-test-data.sql, scoring can be skipped.
-- ─────────────────────────────────────────────────────────────
