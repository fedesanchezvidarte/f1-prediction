-- ============================================================
-- F1 PREDICTION APP — CHAMPION & SEASON AWARD RESULTS (2026)
-- ============================================================
--
-- PURPOSE:
--   Official season-end results for champion prediction scoring.
--   Includes WDC/WCC, most wins/podiums/DNFs, and team best drivers.
--   Fully idempotent — safe to re-run at any time.
--
-- ──────────────────────────────────────────────────────────
--   CHAMPION RESULTS
-- ──────────────────────────────────────────────────────────
--   WDC: NOR               WCC: McLaren
--   Most Wins: NOR (10)    Most Podiums: NOR (24)
--   Most DNFs: HAD
--
-- ──────────────────────────────────────────────────────────
--   TEAM BEST DRIVERS
-- ──────────────────────────────────────────────────────────
--   McLaren=NOR         Red Bull Racing=VER
--   Mercedes=RUS        Ferrari=LEC
--   Williams=SAI        Racing Bulls=LAW
--   Aston Martin=ALO    Haas=BEA
--   Audi=HUL            Alpine=GAS
--   Cadillac=PER
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 0 — CLEANUP
-- ─────────────────────────────────────────────────────────────

DELETE FROM champion_results
WHERE season_id = (SELECT id FROM seasons WHERE year = 2026);

DELETE FROM team_best_driver_results
WHERE season_id = (SELECT id FROM seasons WHERE year = 2026);


-- ═══════════════════════════════════════════════════════════
-- SECTION 1 — CHAMPION RESULTS
--
-- WDC=NOR  WCC=McLaren  Most DNFs=HAD  Most Podiums=NOR  Most Wins=NOR
-- ═══════════════════════════════════════════════════════════

INSERT INTO champion_results
  (season_id, wdc_driver_id, wcc_team_id,
   most_dnfs_driver_id, most_podiums_driver_id, most_wins_driver_id,
   source)
VALUES (
  (SELECT id FROM seasons WHERE year = 2026),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM teams   WHERE name = 'McLaren'     AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'HAD' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM drivers WHERE name_acronym = 'NOR' AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  'manual'
)
ON CONFLICT (season_id) DO UPDATE SET
  wdc_driver_id          = EXCLUDED.wdc_driver_id,
  wcc_team_id            = EXCLUDED.wcc_team_id,
  most_dnfs_driver_id    = EXCLUDED.most_dnfs_driver_id,
  most_podiums_driver_id = EXCLUDED.most_podiums_driver_id,
  most_wins_driver_id    = EXCLUDED.most_wins_driver_id,
  source                 = EXCLUDED.source;


-- ═══════════════════════════════════════════════════════════
-- SECTION 2 — TEAM BEST DRIVER RESULTS (11 teams)
-- ═══════════════════════════════════════════════════════════

WITH s AS (SELECT id FROM seasons WHERE year = 2026),
team_drivers(team_name, driver_acr) AS (VALUES
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
INSERT INTO team_best_driver_results (season_id, team_id, driver_id, source)
SELECT
  (SELECT id FROM s),
  t.id,
  drv.id,
  'manual'
FROM team_drivers td
JOIN teams t      ON t.name = td.team_name         AND t.season_id = (SELECT id FROM s)
JOIN drivers drv  ON drv.name_acronym = td.driver_acr AND drv.season_id = (SELECT id FROM s)
ON CONFLICT (season_id, team_id) DO UPDATE SET
  driver_id = EXCLUDED.driver_id,
  source    = EXCLUDED.source;


-- ─────────────────────────────────────────────────────────────
-- END OF CHAMPION & SEASON AWARD RESULTS
-- ─────────────────────────────────────────────────────────────
