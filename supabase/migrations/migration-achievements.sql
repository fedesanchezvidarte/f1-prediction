-- ============================================================
-- MIGRATION: Add RLS policies for user_achievements writes
-- ============================================================
-- The achievement calculator needs to INSERT new achievements
-- and DELETE revoked ones from user_achievements.
-- The existing RLS policies only allow SELECT.
--
-- Since writes happen from server-side API routes (which use
-- the authenticated user's session via anon key, not service_role),
-- we need explicit INSERT/DELETE policies.
--
-- Admin-level authorization is enforced in the API route code
-- (isAdminUser check) before any DB writes happen.
-- ============================================================

-- Allow authenticated users to insert user_achievements
-- (the API route enforces admin-only access)
CREATE POLICY "User achievements: service can insert"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to delete user_achievements
-- (needed for revoking achievements after result changes)
CREATE POLICY "User achievements: service can delete"
  ON user_achievements FOR DELETE
  TO authenticated
  USING (true);
