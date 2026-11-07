-- ============================================================
-- REVERT LINEUP CHANGE — 2026 Round 21, São Paulo GP (meeting_key 1300)
-- ============================================================
-- Undoes lineup-2026-round21-saopaulo-camara-apply.sql:
--   * Hirakawa (#50) selectable again for meeting_key 1300.
--
-- Rafael Câmara (#51) is deliberately NOT deleted — a DELETE would
-- cascade into any predictions and results referencing him. To take
-- him off the grid, toggle `is_active` from the admin Lineup panel,
-- or uncomment the statement at the bottom of this file.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

DELETE FROM race_lineup_overrides
 WHERE race_id IN (SELECT id FROM races WHERE meeting_key = 1300)
   AND driver_id = (
     SELECT id FROM drivers
      WHERE driver_number = 50
        AND season_id = (SELECT id FROM seasons WHERE year = 2026)
   );

-- Optional: take Câmara off the grid without deleting his row.
-- UPDATE drivers SET is_active = FALSE
--  WHERE driver_number = 51
--    AND season_id = (SELECT id FROM seasons WHERE year = 2026);
