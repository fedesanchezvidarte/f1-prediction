-- ============================================================
-- REVERT LINEUP CHANGE — 2026 Round 13, Italian GP / Monza
-- ============================================================
-- Puts Yuki Tsunoda (#22) back on the grid at Racing Bulls, making it a
-- three-car team again. Only useful if he is genuinely racing.
--
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

UPDATE drivers
   SET is_active = TRUE
 WHERE driver_number = 22
   AND season_id = (SELECT id FROM seasons WHERE year = 2026);
