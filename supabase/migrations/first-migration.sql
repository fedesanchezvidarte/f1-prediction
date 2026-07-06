-- ============================================================
-- F1 PREDICTION APP — DATABASE SCHEMA
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- HELPER: auto-update updated_at on row modification
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  avatar_url    TEXT,
  country_code  TEXT,           -- ISO 3166-1 alpha-2 (for flag display)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. SEASONS
-- ============================================================
CREATE TABLE seasons (
  id          SERIAL PRIMARY KEY,
  year        INTEGER UNIQUE NOT NULL,
  is_current  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TEAMS (per season — rosters/colors can change yearly)
-- ============================================================
CREATE TABLE teams (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,       -- hex color without # (e.g. "FF8000")
  logo_url    TEXT,
  season_id   INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(name, season_id)
);

-- ============================================================
-- 4. DRIVERS (per season — number/team can change yearly)
-- ============================================================
CREATE TABLE drivers (
  id              SERIAL PRIMARY KEY,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  full_name       TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  name_acronym    CHAR(3) NOT NULL,
  driver_number   INTEGER NOT NULL,
  team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  country_code    TEXT,
  headshot_url    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(driver_number, season_id)
);

CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_drivers_season ON drivers(season_id);
CREATE INDEX idx_drivers_team   ON drivers(team_id);

-- ============================================================
-- 5. RACES
-- ============================================================
CREATE TABLE races (
  id                  SERIAL PRIMARY KEY,
  meeting_key         INTEGER UNIQUE NOT NULL,   -- external key (OpenF1 API)
  race_name           TEXT NOT NULL,
  official_name       TEXT,
  circuit_short_name  TEXT NOT NULL,
  country_name        TEXT NOT NULL,
  country_code        CHAR(3),
  location            TEXT NOT NULL,
  date_start          TIMESTAMPTZ NOT NULL,
  date_end            TIMESTAMPTZ NOT NULL,
  round               INTEGER NOT NULL,
  has_sprint          BOOLEAN NOT NULL DEFAULT FALSE,
  season_id           INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(round, season_id)
);

CREATE TRIGGER races_updated_at
  BEFORE UPDATE ON races
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_races_season ON races(season_id, round);

-- ============================================================
-- 6. RACE PREDICTIONS
-- ============================================================
CREATE TABLE race_predictions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  race_id                   INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  pole_position_driver_id   INTEGER REFERENCES drivers(id),
  top_10                    JSONB NOT NULL DEFAULT '[]',   -- ordered [P1, P2, ..., P10] driver IDs
  fastest_lap_driver_id     INTEGER REFERENCES drivers(id),
  fastest_pit_stop_driver_id INTEGER REFERENCES drivers(id),
  status                    TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'submitted', 'scored')),
  points_earned             INTEGER,
  submitted_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, race_id)
);

CREATE TRIGGER race_predictions_updated_at
  BEFORE UPDATE ON race_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_race_predictions_user   ON race_predictions(user_id);
CREATE INDEX idx_race_predictions_race   ON race_predictions(race_id);
CREATE INDEX idx_race_predictions_status ON race_predictions(status);

-- ============================================================
-- 7. SPRINT PREDICTIONS
-- ============================================================
CREATE TABLE sprint_predictions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  race_id                   INTEGER NOT NULL REFERENCES races(id) ON DELETE CASCADE,
  sprint_pole_driver_id     INTEGER REFERENCES drivers(id),
  top_8                     JSONB NOT NULL DEFAULT '[]',   -- ordered [P1, P2, ..., P8] driver IDs
  fastest_lap_driver_id     INTEGER REFERENCES drivers(id),
  status                    TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'submitted', 'scored')),
  points_earned             INTEGER,
  submitted_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, race_id)
);

CREATE TRIGGER sprint_predictions_updated_at
  BEFORE UPDATE ON sprint_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_sprint_predictions_user ON sprint_predictions(user_id);
CREATE INDEX idx_sprint_predictions_race ON sprint_predictions(race_id);

-- ============================================================
-- 8. CHAMPION PREDICTIONS (WDC + WCC, one per user per season)
-- ============================================================
CREATE TABLE champion_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  wdc_driver_id   INTEGER REFERENCES drivers(id),
  wcc_team_id     INTEGER REFERENCES teams(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'submitted', 'scored')),
  points_earned   INTEGER,
  is_half_points  BOOLEAN NOT NULL DEFAULT FALSE,  -- true if submitted after season started
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, season_id)
);

CREATE TRIGGER champion_predictions_updated_at
  BEFORE UPDATE ON champion_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. RACE RESULTS (official, one per race)
-- ============================================================
CREATE TABLE race_results (
  id                          SERIAL PRIMARY KEY,
  race_id                     INTEGER NOT NULL UNIQUE REFERENCES races(id) ON DELETE CASCADE,
  pole_position_driver_id     INTEGER NOT NULL REFERENCES drivers(id),
  top_10                      JSONB NOT NULL,                -- ordered [P1, ..., P10] driver IDs
  fastest_lap_driver_id       INTEGER NOT NULL REFERENCES drivers(id),
  fastest_pit_stop_driver_id  INTEGER NOT NULL REFERENCES drivers(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER race_results_updated_at
  BEFORE UPDATE ON race_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. SPRINT RESULTS (official, one per sprint race)
-- ============================================================
CREATE TABLE sprint_results (
  id                      SERIAL PRIMARY KEY,
  race_id                 INTEGER NOT NULL UNIQUE REFERENCES races(id) ON DELETE CASCADE,
  sprint_pole_driver_id   INTEGER NOT NULL REFERENCES drivers(id),
  top_8                   JSONB NOT NULL,                    -- ordered [P1, ..., P8] driver IDs
  fastest_lap_driver_id   INTEGER NOT NULL REFERENCES drivers(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER sprint_results_updated_at
  BEFORE UPDATE ON sprint_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 11. LEADERBOARD (cached per user per season)
-- ============================================================
CREATE TABLE leaderboard (
  id                  SERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id           INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  total_points        INTEGER NOT NULL DEFAULT 0,
  predictions_count   INTEGER NOT NULL DEFAULT 0,
  perfect_podiums     INTEGER NOT NULL DEFAULT 0,
  best_race_points    INTEGER NOT NULL DEFAULT 0,
  rank                INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, season_id)
);

CREATE TRIGGER leaderboard_updated_at
  BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_leaderboard_ranking ON leaderboard(season_id, total_points DESC);

-- ============================================================
-- 12. ACHIEVEMENTS CATALOG (system-defined)
-- ============================================================
CREATE TABLE achievements (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,             -- programmatic key (e.g. "first_prediction")
  name        TEXT NOT NULL,                    -- display name
  description TEXT NOT NULL,                    -- what the user needs to do
  icon_url    TEXT,
  category    TEXT NOT NULL
              CHECK (category IN ('predictions', 'accuracy', 'milestones', 'special')),
  threshold   INTEGER,                          -- for count-based achievements (e.g. 10 predictions)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 13. USER ACHIEVEMENTS (junction table)
-- ============================================================
CREATE TABLE user_achievements (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id  INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams               ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE races               ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_predictions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_predictions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE champion_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprint_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard         ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements   ENABLE ROW LEVEL SECURITY;

-- ── Profiles ──────────────────────────────────────────────
CREATE POLICY "Profiles: anyone can read"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Profiles: users can update own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Reference data (seasons, teams, drivers, races): read-only ──
CREATE POLICY "Seasons: anyone can read"
  ON seasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teams: anyone can read"
  ON teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Drivers: anyone can read"
  ON drivers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Races: anyone can read"
  ON races FOR SELECT TO authenticated USING (true);

-- ── Race predictions ──────────────────────────────────────
CREATE POLICY "Race predictions: anyone can read"
  ON race_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Race predictions: users can insert own"
  ON race_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Race predictions: users can update own"
  ON race_predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Sprint predictions ────────────────────────────────────
CREATE POLICY "Sprint predictions: anyone can read"
  ON sprint_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sprint predictions: users can insert own"
  ON sprint_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sprint predictions: users can update own"
  ON sprint_predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Champion predictions ──────────────────────────────────
CREATE POLICY "Champion predictions: anyone can read"
  ON champion_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Champion predictions: users can insert own"
  ON champion_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Champion predictions: users can update own"
  ON champion_predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Results (read-only for users, admin writes via service role) ──
CREATE POLICY "Race results: anyone can read"
  ON race_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sprint results: anyone can read"
  ON sprint_results FOR SELECT TO authenticated USING (true);

-- ── Leaderboard ───────────────────────────────────────────
CREATE POLICY "Leaderboard: anyone can read"
  ON leaderboard FOR SELECT TO authenticated USING (true);

-- ── Achievements ──────────────────────────────────────────
CREATE POLICY "Achievements: anyone can read"
  ON achievements FOR SELECT TO authenticated USING (true);

CREATE POLICY "User achievements: anyone can read"
  ON user_achievements FOR SELECT TO authenticated USING (true);
