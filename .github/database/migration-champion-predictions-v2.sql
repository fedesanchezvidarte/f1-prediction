-- Migration: Champion Predictions V2
-- Adds new prediction categories: most DNFs, most podiums, most wins, team best driver
-- Also adds 8 new achievements and wdc_correct/wcc_correct tracking columns
-- This migration is IDEMPOTENT — safe to run multiple times.

-- ============================================================
-- 1. Add columns to champion_predictions
-- ============================================================
ALTER TABLE champion_predictions
  ADD COLUMN IF NOT EXISTS most_dnfs_driver_id BIGINT REFERENCES drivers(id),
  ADD COLUMN IF NOT EXISTS most_podiums_driver_id BIGINT REFERENCES drivers(id),
  ADD COLUMN IF NOT EXISTS most_wins_driver_id BIGINT REFERENCES drivers(id),
  ADD COLUMN IF NOT EXISTS wdc_correct BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wcc_correct BOOLEAN DEFAULT FALSE;

-- ============================================================
-- 2. Add columns to champion_results
-- ============================================================
ALTER TABLE champion_results
  ADD COLUMN IF NOT EXISTS most_dnfs_driver_id BIGINT REFERENCES drivers(id),
  ADD COLUMN IF NOT EXISTS most_podiums_driver_id BIGINT REFERENCES drivers(id),
  ADD COLUMN IF NOT EXISTS most_wins_driver_id BIGINT REFERENCES drivers(id);

-- ============================================================
-- 3. Create team_best_driver_predictions table
-- ============================================================
CREATE TABLE IF NOT EXISTS team_best_driver_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id BIGINT NOT NULL REFERENCES seasons(id),
  team_id BIGINT NOT NULL REFERENCES teams(id),
  driver_id BIGINT NOT NULL REFERENCES drivers(id),
  is_half_points BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'scored')),
  points_earned INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  UNIQUE (user_id, season_id, team_id)
);

-- ============================================================
-- 4. Create team_best_driver_results table
-- ============================================================
CREATE TABLE IF NOT EXISTS team_best_driver_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id BIGINT NOT NULL REFERENCES seasons(id),
  team_id BIGINT NOT NULL REFERENCES teams(id),
  driver_id BIGINT NOT NULL REFERENCES drivers(id),
  source TEXT NOT NULL DEFAULT 'manual',
  UNIQUE (season_id, team_id)
);

-- ============================================================
-- 5. Enable RLS on new tables
-- ============================================================
ALTER TABLE team_best_driver_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_best_driver_results ENABLE ROW LEVEL SECURITY;

-- team_best_driver_predictions: users can read their own, admins can read all
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_best_driver_predictions' AND policyname = 'Users can read own team_best_driver_predictions'
  ) THEN
    CREATE POLICY "Users can read own team_best_driver_predictions"
      ON team_best_driver_predictions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_best_driver_predictions' AND policyname = 'Users can insert own team_best_driver_predictions'
  ) THEN
    CREATE POLICY "Users can insert own team_best_driver_predictions"
      ON team_best_driver_predictions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_best_driver_predictions' AND policyname = 'Users can update own team_best_driver_predictions'
  ) THEN
    CREATE POLICY "Users can update own team_best_driver_predictions"
      ON team_best_driver_predictions FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- team_best_driver_results: all authenticated users can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_best_driver_results' AND policyname = 'Authenticated users can read team_best_driver_results'
  ) THEN
    CREATE POLICY "Authenticated users can read team_best_driver_results"
      ON team_best_driver_results FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Service role can do everything (for admin API routes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_best_driver_predictions' AND policyname = 'Service role full access team_best_driver_predictions'
  ) THEN
    CREATE POLICY "Service role full access team_best_driver_predictions"
      ON team_best_driver_predictions FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'team_best_driver_results' AND policyname = 'Service role full access team_best_driver_results'
  ) THEN
    CREATE POLICY "Service role full access team_best_driver_results"
      ON team_best_driver_results FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- ============================================================
-- 6. Insert 8 new achievements (idempotent via slug check)
-- ============================================================
INSERT INTO achievements (slug, name, description, category, threshold, icon_url)
SELECT * FROM (VALUES
  ('race_prediction_winner', 'Race Prediction Winner', 'Finished #1 scorer on a race prediction', 'special', 1, NULL),
  ('race_prediction_winner_10', 'Dominant Predictor', 'Finished #1 scorer on 10 race predictions', 'milestones', 10, NULL),
  ('race_prediction_podium', 'Prediction Podium', 'Finished top 3 scorer on a race prediction', 'special', 1, NULL),
  ('sprint_prediction_winner', 'Sprint Prediction Winner', 'Finished #1 scorer on a sprint prediction', 'special', 1, NULL),
  ('sprint_prediction_podium', 'Sprint Prediction Podium', 'Finished top 3 scorer on a sprint prediction', 'special', 1, NULL),
  ('predict_1_team_best', 'Team Whisperer', 'Correctly predicted 1 team''s best driver', 'special', 1, NULL),
  ('predict_5_team_best', 'Team Expert', 'Correctly predicted 5 teams'' best drivers', 'milestones', 5, NULL),
  ('predict_10_team_best', 'Team Oracle', 'Perfectly predicted all 10 teams'' best drivers', 'milestones', 10, NULL)
) AS v(slug, name, description, category, threshold, icon_url)
WHERE NOT EXISTS (
  SELECT 1 FROM achievements WHERE achievements.slug = v.slug
);

-- ============================================================
-- 7. Protect scoring columns from direct user manipulation
-- ============================================================
-- A trigger ensures that only service_role can modify scoring-related
-- columns on champion_predictions and team_best_driver_predictions.
-- Regular authenticated users can only update prediction input columns.

CREATE OR REPLACE FUNCTION protect_champion_scoring_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    NEW.status := OLD.status;
    NEW.points_earned := OLD.points_earned;
    NEW.wdc_correct := OLD.wdc_correct;
    NEW.wcc_correct := OLD.wcc_correct;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS champion_predictions_protect_scoring ON champion_predictions;
CREATE TRIGGER champion_predictions_protect_scoring
  BEFORE UPDATE ON champion_predictions
  FOR EACH ROW
  EXECUTE FUNCTION protect_champion_scoring_columns();

CREATE OR REPLACE FUNCTION protect_tbd_scoring_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    NEW.status := OLD.status;
    NEW.points_earned := OLD.points_earned;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tbd_predictions_protect_scoring ON team_best_driver_predictions;
CREATE TRIGGER tbd_predictions_protect_scoring
  BEFORE UPDATE ON team_best_driver_predictions
  FOR EACH ROW
  EXECUTE FUNCTION protect_tbd_scoring_columns();
