-- ============================================================
-- REVERT LINEUP CHANGE — 2026 Round 19, Mexico City GP (meeting_key 1299)
-- ============================================================
-- Undoes lineup-2026-round19-mexico-hirakawa-apply.sql:
--   * Ocon (#31) selectable again for meeting_keys 1299-1303.
--   * Tsunoda (#22) selectable again for meeting_keys 1299-1303.
--
-- Ryo Hirakawa (#50) is deliberately NOT deleted — a DELETE would
-- cascade into any predictions and results referencing him (he is in
-- the Mexico City top 10). To take him off the grid, toggle
-- `is_active` from the admin Lineup panel, or uncomment the statement
-- at the bottom of this file.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

DELETE FROM race_lineup_overrides
 WHERE race_id IN (SELECT id FROM races WHERE meeting_key IN (1299, 1300, 1301, 1302, 1303))
   AND driver_id = (
     SELECT id FROM drivers
      WHERE driver_number = 31
        AND season_id = (SELECT id FROM seasons WHERE year = 2026)
   );

DELETE FROM race_lineup_overrides
 WHERE race_id IN (SELECT id FROM races WHERE meeting_key IN (1299, 1300, 1301, 1302, 1303))
   AND driver_id = (
     SELECT id FROM drivers
      WHERE driver_number = 22
        AND season_id = (SELECT id FROM seasons WHERE year = 2026)
   );

-- Optional: take Hirakawa off the grid without deleting his row.
-- UPDATE drivers SET is_active = FALSE
--  WHERE driver_number = 50
--    AND season_id = (SELECT id FROM seasons WHERE year = 2026);
