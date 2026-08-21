-- ============================================================
-- REVERT LINEUP CHANGE — 2026 Round 14, Dutch GP (meeting_key 1293)
-- ============================================================
-- Undoes lineup-2026-round14-dutch-apply.sql:
--   * Hadjar (#6) selectable again.
--   * Lawson (#30) back to Racing Bulls; his round-14 WCC points
--     re-attribute to Racing Bulls.
--
-- Yuki Tsunoda (#22) is deliberately NOT deleted — a DELETE would
-- cascade into any predictions and results referencing him. To take
-- him off the grid, toggle `is_active` from the admin Lineup panel,
-- or uncomment the statement at the bottom of this file.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

DELETE FROM race_lineup_overrides
 WHERE race_id = (SELECT id FROM races WHERE meeting_key = 1293)
   AND driver_id IN (
     SELECT id FROM drivers
      WHERE driver_number IN (6, 30)
        AND season_id = (SELECT id FROM seasons WHERE year = 2026)
   );

-- Optional: take Tsunoda off the grid without deleting his row.
-- UPDATE drivers SET is_active = FALSE
--  WHERE driver_number = 22
--    AND season_id = (SELECT id FROM seasons WHERE year = 2026);
