-- ============================================================
-- REVERT LINEUP CHANGE — 2026 Round 13, Italian GP / Monza
-- ============================================================
-- Undoes lineup-2026-round13-monza-hadjar-out-apply.sql:
--   * Hadjar (#6) selectable again.
--   * Lawson (#30) back to Racing Bulls; his round-13 WCC points
--     re-attribute to Racing Bulls.
--
-- Yuki Tsunoda (#22) is deliberately NOT deactivated here — do that only
-- once you know he isn't racing (uncomment the statement below, or use
-- the admin Lineup panel's "On the grid" toggle).
--
-- Do NOT run this once Monza has been scored — deleting these rows would
-- un-bench Hadjar retroactively and move Lawson's constructor points off
-- Red Bull Racing, same caveat as the Dutch GP revert.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

DELETE FROM race_lineup_overrides
 WHERE race_id = (SELECT id FROM races WHERE meeting_key = 1294)
   AND driver_id IN (
     SELECT id FROM drivers
      WHERE driver_number IN (6, 30)
        AND season_id = (SELECT id FROM seasons WHERE year = 2026)
   );

-- Optional: take Tsunoda off the grid without deleting his row.
-- UPDATE drivers SET is_active = FALSE
--  WHERE driver_number = 22
--    AND season_id = (SELECT id FROM seasons WHERE year = 2026);
