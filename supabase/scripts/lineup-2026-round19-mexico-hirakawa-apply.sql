-- ============================================================
-- LINEUP CHANGE — 2026 Round 19, Mexico City GP (meeting_key 1299)
--                 and every remaining 2026 round
-- ============================================================
-- Haas dropped Esteban Ocon on the Mexico City weekend:
--   Ryo Hirakawa (#50) — joins the grid at HAAS (new permanent row).
--     The FIA approved him in car #50 (Ocon's #31 entry, engine and
--     tyres carried over). He scored P10 on his debut; those WCC
--     points go to Haas through drivers.team_id.
--   Esteban Ocon  (#31) — OUT from Mexico City to the end of the season.
--   Yuki Tsunoda  (#22) — OUT from Mexico City to the end of the season
--                          (until announced otherwise).
--
-- Ocon is benched with one override per race rather than
-- drivers.is_active = FALSE: is_active is season-wide and would also
-- grey him out of rounds 1-18, which he did race.
--
-- Remaining rounds benched (by meeting_key, not round number — the
-- Sepang insertion shifted round numbers):
--   1299 Mexico City · 1300 São Paulo · 1301 Las Vegas
--   1302 Qatar       · 1303 Abu Dhabi
--
-- Hirakawa is NOT benched for future rounds. If Haas puts someone else
-- in the car (e.g. Rafael Câmara) bench him per race from the admin
-- Lineup panel, the same way as Tsunoda.
--
-- Prerequisite: migration-race-lineup-overrides.sql
-- Paired revert: lineup-2026-round19-mexico-hirakawa-revert.sql
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

BEGIN;

-- ── 1. Ryo Hirakawa joins the grid (permanent driver row) ─────
-- #50 is unused in the 2026 season. Not undone by the revert:
-- deleting a driver cascades into predictions and results.
INSERT INTO drivers (first_name, last_name, name_acronym, driver_number, team_id, season_id, is_active)
VALUES (
  'Ryo', 'Hirakawa', 'HIR', 50,
  (SELECT id FROM teams   WHERE name = 'Haas'
                            AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM seasons WHERE year = 2026),
  TRUE
)
ON CONFLICT (driver_number, season_id) DO NOTHING;

-- ── 2. Ocon out for Mexico City and every remaining round ─────
INSERT INTO race_lineup_overrides (race_id, driver_id, is_unavailable, team_id, note)
SELECT r.id,
       (SELECT id FROM drivers WHERE driver_number = 31
                                 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
       TRUE,
       NULL,
       'Out - dropped by Haas from Mexico City GP 2026 onwards'
  FROM races r
 WHERE r.meeting_key IN (1299, 1300, 1301, 1302, 1303)
ON CONFLICT (race_id, driver_id) DO UPDATE
  SET is_unavailable = EXCLUDED.is_unavailable,
      team_id        = EXCLUDED.team_id,
      note           = EXCLUDED.note;

-- ── 3. Tsunoda out from Mexico City onwards ──────────────────
-- He was reactivated season-wide for Madrid and never benched again.
-- He is not racing again unless announced, so bench him for every
-- remaining round (same approach as Ocon, keeps his past rounds intact).
INSERT INTO race_lineup_overrides (race_id, driver_id, is_unavailable, team_id, note)
SELECT r.id,
       (SELECT id FROM drivers WHERE driver_number = 22
                                 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
       TRUE,
       NULL,
       'Out - not on the grid from Mexico City GP 2026 onwards'
  FROM races r
 WHERE r.meeting_key IN (1299, 1300, 1301, 1302, 1303)
ON CONFLICT (race_id, driver_id) DO UPDATE
  SET is_unavailable = EXCLUDED.is_unavailable,
      team_id        = EXCLUDED.team_id,
      note           = EXCLUDED.note;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────
-- Expect 10 rows (Ocon + Tsunoda x 5 races), is_unavailable = true:
-- SELECT r.meeting_key, r.race_name, d.driver_number, d.last_name, o.is_unavailable, o.note
--   FROM race_lineup_overrides o
--   JOIN races   r ON r.id = o.race_id
--   JOIN drivers d ON d.id = o.driver_id
--  WHERE r.meeting_key BETWEEN 1299 AND 1303
--  ORDER BY r.meeting_key;
--
-- Expect 1 row at Haas:
-- SELECT d.id, d.full_name, d.driver_number, t.name, d.is_active
--   FROM drivers d JOIN teams t ON t.id = d.team_id
--  WHERE d.driver_number = 50
--    AND d.season_id = (SELECT id FROM seasons WHERE year = 2026);
