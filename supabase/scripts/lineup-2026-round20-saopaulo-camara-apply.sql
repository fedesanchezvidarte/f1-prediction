-- ============================================================
-- LINEUP CHANGE — 2026 Round 20, São Paulo GP (meeting_key 1300)
--                 and every remaining 2026 round
-- ============================================================
-- Haas puts Rafael Câmara in Ocon's old seat for his home race; reserve
-- Ryo Hirakawa, who drove it in Mexico City, steps aside for his WEC
-- finale:
--   Rafael Câmara (#51) — joins the grid at HAAS (new permanent row).
--     #51 is a placeholder: #50 is still assigned to Hirakawa, who used
--     it in Mexico City, and (driver_number, season_id) is UNIQUE.
--   Ryo Hirakawa  (#50) — OUT from São Paulo to the end of the season.
--
-- Haas had not announced Las Vegas onwards when this was written; the
-- remaining rounds assume Câmara keeps the seat. If that changes, flip
-- the overrides per race from the admin Lineup panel.
--
-- Mexico City (meeting_key 1299) is untouched — Hirakawa raced and it
-- is already scored. Ocon (#31) and Tsunoda (#22) are already benched
-- for 1300–1303 by lineup-2026-round19-mexico-hirakawa-apply.sql.
--
-- Benched rounds (by meeting_key, not round number):
--   1300 São Paulo · 1301 Las Vegas · 1302 Qatar · 1303 Abu Dhabi
--
-- No existing prediction for 1300–1303 picked Hirakawa when this ran,
-- so no prediction rows needed rewriting.
--
-- Prerequisite: migration-race-lineup-overrides.sql
-- Paired revert: lineup-2026-round20-saopaulo-camara-revert.sql
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

BEGIN;

-- ── 1. Rafael Câmara joins the grid (permanent driver row) ────
-- Not undone by the revert: deleting a driver cascades into
-- predictions and results.
INSERT INTO drivers (first_name, last_name, name_acronym, driver_number, team_id, season_id, is_active)
VALUES (
  'Rafael', 'Câmara', 'CAM', 51,
  (SELECT id FROM teams   WHERE name = 'Haas'
                            AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM seasons WHERE year = 2026),
  TRUE
)
ON CONFLICT (driver_number, season_id) DO NOTHING;

-- ── 2. Hirakawa out for São Paulo and every remaining round ───
INSERT INTO race_lineup_overrides (race_id, driver_id, is_unavailable, team_id, note)
SELECT r.id,
       (SELECT id FROM drivers WHERE driver_number = 50
                                 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
       TRUE,
       NULL,
       'Out - Haas fields Rafael Câmara from São Paulo GP 2026 onwards'
  FROM races r
 WHERE r.meeting_key IN (1300, 1301, 1302, 1303)
ON CONFLICT (race_id, driver_id) DO UPDATE
  SET is_unavailable = EXCLUDED.is_unavailable,
      team_id        = EXCLUDED.team_id,
      note           = EXCLUDED.note;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────
-- Expect Ocon, Tsunoda and Hirakawa benched for each of 1300–1303:
-- SELECT r.meeting_key, d.driver_number, d.last_name, o.is_unavailable, o.note
--   FROM race_lineup_overrides o
--   JOIN races   r ON r.id = o.race_id
--   JOIN drivers d ON d.id = o.driver_id
--  WHERE r.meeting_key IN (1300, 1301, 1302, 1303)
--  ORDER BY r.meeting_key, d.driver_number;
--
-- Expect 1 row at Haas:
-- SELECT d.id, d.first_name, d.last_name, d.driver_number, t.name, d.is_active
--   FROM drivers d JOIN teams t ON t.id = d.team_id
--  WHERE d.driver_number = 51
--    AND d.season_id = (SELECT id FROM seasons WHERE year = 2026);
