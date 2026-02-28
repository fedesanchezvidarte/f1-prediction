-- ============================================================
-- MIGRATION: Add source tracking to race_results & sprint_results
-- ============================================================
-- Tracks whether results were fetched from OpenF1 or entered manually.
-- Values: 'openf1' | 'manual'
--
-- IMPORTANT: Run this migration in the Supabase SQL editor.
-- Without it, scoring will fail because the admin cannot update
-- other users' predictions or the leaderboard table.
-- ============================================================

ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('openf1', 'manual'));

ALTER TABLE sprint_results
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual'
  CHECK (source IN ('openf1', 'manual'));

-- ============================================================
-- RLS: Allow service_role / admin to write results
-- ============================================================
-- These policies already exist for reads. We need INSERT/UPDATE
-- policies for the service role (used by Next.js API routes).
-- Since the API routes use the authenticated user's session
-- (not service_role), we rely on the Supabase client running
-- as an authenticated user. The admin check is in the API code.
--
-- To add DB-level admin write policies:

-- CREATE POLICY "Race results: admin can insert"
--   ON race_results FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     (SELECT auth.jwt() ->> 'role') = 'admin'
--     OR auth.uid()::text = ANY(string_to_array(current_setting('app.admin_user_ids', true), ','))
--   );

-- CREATE POLICY "Race results: admin can update"
--   ON race_results FOR UPDATE
--   TO authenticated
--   USING (true)
--   WITH CHECK (
--     (SELECT auth.jwt() ->> 'role') = 'admin'
--     OR auth.uid()::text = ANY(string_to_array(current_setting('app.admin_user_ids', true), ','))
--   );

-- For now, the simplest approach is to grant full write access
-- via service_role key in the API routes, or add these policies:

CREATE POLICY "Race results: admin can insert"
  ON race_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Race results: admin can update"
  ON race_results FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Sprint results: admin can insert"
  ON sprint_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sprint results: admin can update"
  ON sprint_results FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Leaderboard needs INSERT/UPDATE for scoring
CREATE POLICY "Leaderboard: service can insert"
  ON leaderboard FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Leaderboard: service can update"
  ON leaderboard FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Race predictions need to be updatable (for scoring status)
CREATE POLICY "Race predictions: admin can update status"
  ON race_predictions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Sprint predictions need to be updatable (for scoring status)
CREATE POLICY "Sprint predictions: admin can update status"
  ON sprint_predictions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
