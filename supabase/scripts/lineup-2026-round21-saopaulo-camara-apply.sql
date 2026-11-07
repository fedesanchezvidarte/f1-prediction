-- ============================================================
-- LINEUP CHANGE — 2026 Round 21, São Paulo GP (meeting_key 1300)
-- ============================================================
-- Haas puts Rafael Câmara in the car for his home race instead of
-- Ryo Hirakawa (Ocon's old seat):
--   Rafael Câmara (#51) — joins the grid at HAAS (new permanent row).
--     He races #51, not #50: #50 is still assigned to Hirakawa,
--     who used it in Mexico City.
--   Ryo Hirakawa  (#50) — OUT for São Paulo only.
--
-- Ocon (#31) and Tsunoda (#22) are already benched for 1300 by
-- lineup-2026-round19-mexico-hirakawa-apply.sql; nothing to do there.
--
-- Câmara is NOT benched for later rounds and Hirakawa is NOT benched
-- beyond São Paulo: Haas has not announced Las Vegas onwards. Adjust
-- per race from the admin Lineup panel once it is known.
--
-- Prerequisite: migration-race-lineup-overrides.sql
-- Paired revert: lineup-2026-round21-saopaulo-camara-revert.sql
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

BEGIN;

-- ── 1. Rafael Câmara joins the grid (permanent driver row) ────
-- #51 is unused in the 2026 season. Not undone by the revert:
-- deleting a driver cascades into predictions and results.
INSERT INTO drivers (first_name, last_name, name_acronym, driver_number, team_id, season_id, is_active)
VALUES (
  'Rafael', 'Câmara', 'CAM', 51,
  (SELECT id FROM teams   WHERE name = 'Haas'
                            AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
  (SELECT id FROM seasons WHERE year = 2026),
  TRUE
)
ON CONFLICT (driver_number, season_id) DO NOTHING;

-- ── 2. Hirakawa out for São Paulo ─────────────────────────────
INSERT INTO race_lineup_overrides (race_id, driver_id, is_unavailable, team_id, note)
SELECT r.id,
       (SELECT id FROM drivers WHERE driver_number = 50
                                 AND season_id = (SELECT id FROM seasons WHERE year = 2026)),
       TRUE,
       NULL,
       'Out - Haas fields Rafael Câmara at São Paulo GP 2026'
  FROM races r
 WHERE r.meeting_key = 1300
ON CONFLICT (race_id, driver_id) DO UPDATE
  SET is_unavailable = EXCLUDED.is_unavailable,
      team_id        = EXCLUDED.team_id,
      note           = EXCLUDED.note;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────
-- Expect Ocon, Tsunoda and Hirakawa benched for 1300:
-- SELECT d.driver_number, d.last_name, o.is_unavailable, o.note
--   FROM race_lineup_overrides o
--   JOIN races   r ON r.id = o.race_id
--   JOIN drivers d ON d.id = o.driver_id
--  WHERE r.meeting_key = 1300;
--
-- Expect 1 row at Haas:
-- SELECT d.id, d.first_name, d.last_name, d.driver_number, t.name, d.is_active
--   FROM drivers d JOIN teams t ON t.id = d.team_id
--  WHERE d.driver_number = 51
--    AND d.season_id = (SELECT id FROM seasons WHERE year = 2026);
