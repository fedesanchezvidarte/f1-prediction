-- ============================================================
-- MIGRATION: Add RLS write policies for the races table
-- ============================================================
-- The races table only had a SELECT policy.
-- Admin API routes (update-datetime, fetch-openf1-datetime)
-- were silently failing: Supabase returned no error but updated
-- 0 rows because no UPDATE policy existed.
--
-- Security is enforced in the API route code (isAdminUser check)
-- before any DB writes happen, following the same pattern used
-- for race_results, sprint_results, leaderboard, and
-- user_achievements.
-- ============================================================

CREATE POLICY "Races: admin can update"
  ON races FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
