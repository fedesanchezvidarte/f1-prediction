-- ============================================================
-- MIGRATION: Add Driver of the Day prediction & result support
-- ============================================================
-- Adds a new nullable column to both race_predictions and
-- race_results to track the Driver of the Day selection.
-- Also inserts the "The Fan's Choice" achievement.
--
-- IMPORTANT: Run this migration in the Supabase SQL editor.
-- ============================================================

-- 1. Add column to race_predictions
ALTER TABLE race_predictions
  ADD COLUMN IF NOT EXISTS driver_of_the_day_driver_id INTEGER REFERENCES drivers(id);

-- 2. Add column to race_results (nullable — not all sources provide DOTD)
ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS driver_of_the_day_driver_id INTEGER REFERENCES drivers(id);

-- 3. Insert the "The Fan's Choice" achievement
INSERT INTO achievements (slug, name, description, category, threshold)
VALUES (
  'fans_choice',
  'The Fan''s Choice',
  'Predict the Driver of the Day correctly',
  'special',
  NULL
)
ON CONFLICT (slug) DO NOTHING;
