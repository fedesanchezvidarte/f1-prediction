-- ============================================================
-- MIGRATION: Fix team_best_driver_predictions RLS policies
-- ============================================================
-- The team_best_driver_predictions table had a restrictive SELECT
-- policy that only allowed users to read their OWN rows.
-- This prevented the scoring engine and achievement calculator
-- (running as the admin user) from reading other users'
-- predictions — silently causing TBD scoring and TBD achievements
-- to fail for non-admin users.
--
-- This migration:
-- 1. Replaces the restrictive SELECT policy with a permissive one
--    (matching the pattern of race_predictions, sprint_predictions,
--    and champion_predictions).
-- 2. Adds a missing admin UPDATE policy for champion_predictions
--    (needed for champion scoring to work for all users).
--
-- IMPORTANT: Run this migration in the Supabase SQL editor.
-- ============================================================

-- ── 1. Fix team_best_driver_predictions SELECT policy ─────────

-- Drop the restrictive policy that only allows reading own rows
DROP POLICY IF EXISTS "Users can read own team_best_driver_predictions"
  ON team_best_driver_predictions;

-- Create a permissive policy matching the other prediction tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_best_driver_predictions'
      AND policyname = 'Team best driver predictions: anyone can read'
  ) THEN
    CREATE POLICY "Team best driver predictions: anyone can read"
      ON team_best_driver_predictions FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ── 2. Add admin UPDATE policy for champion_predictions ───────
-- The race_predictions and sprint_predictions tables already have
-- broad UPDATE policies (from migration-admin-results.sql) that
-- allow the scoring engine to update any user's prediction.
-- champion_predictions was missing this, causing champion scoring
-- to silently skip non-admin users' predictions.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'champion_predictions'
      AND policyname = 'Champion predictions: admin can update status'
  ) THEN
    CREATE POLICY "Champion predictions: admin can update status"
      ON champion_predictions FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
