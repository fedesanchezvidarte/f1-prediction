-- ============================================================
-- LINEUP CHANGE — 2026 Round 13, Italian GP / Monza (meeting_key 1294)
-- ============================================================
-- Grid returns to the regular season lineup after the Dutch GP swap:
--   Isack Hadjar   (#6)  — IN, Red Bull Racing (his season team).
--   Liam Lawson    (#30) — IN, Racing Bulls (his season team).
--   Yuki Tsunoda   (#22) — OUT from this round on.
--
-- Hadjar and Lawson need NO statement here. Their Dutch GP changes were
-- per-race rows on meeting_key 1293 only, so round 13 already falls back
-- to the season grid. Do NOT run lineup-2026-round14-dutch-revert.sql to
-- "restore" them — the Dutch GP is already scored, and deleting those rows
-- would un-bench Hadjar retroactively and move Lawson's Dutch constructor
-- points off Red Bull Racing.
--
-- Tsunoda joined as a permanent driver row to cover Lawson's Racing Bulls
-- seat for one weekend. With Lawson back, Racing Bulls would otherwise field
-- three drivers. He is deactivated season-wide rather than deleted: a DELETE
-- cascades into predictions and results, and `is_active = FALSE` still
-- resolves his name in anything already recorded against him.
--
-- Paired revert: lineup-2026-round13-monza-revert.sql
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================

UPDATE drivers
   SET is_active = FALSE
 WHERE driver_number = 22
   AND season_id = (SELECT id FROM seasons WHERE year = 2026);

-- ── Verify ────────────────────────────────────────────────────
-- Expect: Red Bull Racing = Verstappen, Hadjar
--         Racing Bulls    = Lawson, Lindblad
-- SELECT t.name AS team, d.driver_number, d.last_name
--   FROM drivers d
--   JOIN teams t ON t.id = d.team_id
--  WHERE d.season_id = (SELECT id FROM seasons WHERE year = 2026)
--    AND d.is_active
--    AND t.name IN ('Red Bull Racing', 'Racing Bulls')
--  ORDER BY t.name, d.driver_number;
