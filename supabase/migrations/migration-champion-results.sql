-- ============================================================
-- MIGRATION: Champion results + Season Award framework
-- ============================================================
--
-- PHASE 1 (TODAY)
--   Adds `champion_results` so the existing WDC/WCC admin panel
--   works without any code changes.
--
-- PHASE 2 (EXTENSIBLE FUTURE)
--   Adds a generic "season award" framework:
--
--     season_award_types        — catalog row per prediction category
--                                 (most wins, most podiums, best Ferrari
--                                  driver, most DNFs, etc.)
--     season_award_results      — official result for each category
--     season_award_predictions  — user prediction per category
--
--   WDC and WCC are seeded as the first two award types so the
--   framework is ready to grow. Existing champion_predictions /
--   champion_results tables are NOT replaced; they stay active
--   until a future migration migrates them into the new framework.
--
-- ============================================================


-- ============================================================
-- PHASE 1 — champion_results
-- ============================================================

CREATE TABLE champion_results (
  id              SERIAL PRIMARY KEY,
  season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  wdc_driver_id   INTEGER NOT NULL REFERENCES drivers(id),
  wcc_team_id     INTEGER NOT NULL REFERENCES teams(id),
  source          TEXT NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual', 'openf1')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Only one WDC/WCC result per season
  UNIQUE(season_id)
);

CREATE TRIGGER champion_results_updated_at
  BEFORE UPDATE ON champion_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE champion_results ENABLE ROW LEVEL SECURITY;

-- Anyone can read results
CREATE POLICY "Champion results: anyone can read"
  ON champion_results FOR SELECT
  TO authenticated
  USING (true);

-- Admin can insert (auth check is enforced in API route code)
CREATE POLICY "Champion results: admin can insert"
  ON champion_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin can update
CREATE POLICY "Champion results: admin can update"
  ON champion_results FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Admin can delete (needed for reset)
CREATE POLICY "Champion results: admin can delete"
  ON champion_results FOR DELETE
  TO authenticated
  USING (true);

-- champion_predictions also needs write access for the scoring pipeline
-- (set status → scored, set points_earned)
CREATE POLICY "Champion predictions: admin can update status"
  ON champion_predictions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- PHASE 2 — Season Award framework
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 2a. season_award_types
--
-- Catalog of every season-level prediction category.
-- One row per award type per season so points, naming, and
-- visibility can differ across years.
--
-- subject_type:
--   'driver' → the correct answer is a driver (WDC, most wins…)
--   'team'   → the correct answer is a team   (WCC, most 1-2s…)
--
-- scope_team_id:
--   NULL  → global award (all drivers/teams in scope)
--   SET   → award is scoped to one team's drivers
--           e.g. "Best Ferrari driver of the season"
-- ────────────────────────────────────────────────────────────
CREATE TABLE season_award_types (
  id              SERIAL PRIMARY KEY,
  season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,         -- programmatic key, e.g. 'most_wins'
  name            TEXT NOT NULL,         -- display name, e.g. 'Most Race Wins'
  description     TEXT,
  subject_type    TEXT NOT NULL
                  CHECK (subject_type IN ('driver', 'team')),
  scope_team_id   INTEGER REFERENCES teams(id),  -- NULL = all; non-null = team-scoped
  points_value    INTEGER NOT NULL DEFAULT 25,    -- points awarded for a correct prediction
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INTEGER NOT NULL DEFAULT 0,     -- display ordering in the UI
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(slug, season_id)
);

CREATE INDEX idx_season_award_types_season ON season_award_types(season_id, sort_order);

ALTER TABLE season_award_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Season award types: anyone can read"
  ON season_award_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Season award types: admin can insert"
  ON season_award_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Season award types: admin can update"
  ON season_award_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ────────────────────────────────────────────────────────────
-- 2b. season_award_results
--
-- Official result for each award type once the season ends.
-- Exactly one of driver_id / team_id must be set, matching
-- the subject_type of the linked award type.
-- ────────────────────────────────────────────────────────────
CREATE TABLE season_award_results (
  id              SERIAL PRIMARY KEY,
  season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  award_type_id   INTEGER NOT NULL REFERENCES season_award_types(id) ON DELETE CASCADE,
  driver_id       INTEGER REFERENCES drivers(id),  -- set when subject_type = 'driver'
  team_id         INTEGER REFERENCES teams(id),    -- set when subject_type = 'team'
  source          TEXT NOT NULL DEFAULT 'manual'
                  CHECK (source IN ('manual', 'openf1')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One result per award type per season
  UNIQUE(season_id, award_type_id),

  -- Exactly one subject must be provided
  CHECK (
    (driver_id IS NOT NULL AND team_id IS NULL) OR
    (driver_id IS NULL     AND team_id IS NOT NULL)
  )
);

CREATE TRIGGER season_award_results_updated_at
  BEFORE UPDATE ON season_award_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_season_award_results_season ON season_award_results(season_id);

ALTER TABLE season_award_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Season award results: anyone can read"
  ON season_award_results FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Season award results: admin can insert"
  ON season_award_results FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Season award results: admin can update"
  ON season_award_results FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Season award results: admin can delete"
  ON season_award_results FOR DELETE
  TO authenticated
  USING (true);


-- ────────────────────────────────────────────────────────────
-- 2c. season_award_predictions
--
-- One prediction row per user per award type per season.
-- Mirrors the champion_predictions pattern:
--   pending   → user has not yet submitted
--   submitted → locked in, waiting for result
--   scored    → result known, points_earned set
-- ────────────────────────────────────────────────────────────
CREATE TABLE season_award_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id       INTEGER NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  award_type_id   INTEGER NOT NULL REFERENCES season_award_types(id) ON DELETE CASCADE,
  driver_id       INTEGER REFERENCES drivers(id),   -- set when subject_type = 'driver'
  team_id         INTEGER REFERENCES teams(id),     -- set when subject_type = 'team'
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'submitted', 'scored')),
  points_earned   INTEGER,
  is_half_points  BOOLEAN NOT NULL DEFAULT FALSE,   -- true if submitted after season started
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One prediction per user per award type per season
  UNIQUE(user_id, season_id, award_type_id),

  -- Exactly one subject must be provided (once submitted)
  CHECK (
    driver_id IS NULL OR team_id IS NULL
  )
);

CREATE TRIGGER season_award_predictions_updated_at
  BEFORE UPDATE ON season_award_predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_season_award_predictions_user   ON season_award_predictions(user_id);
CREATE INDEX idx_season_award_predictions_season ON season_award_predictions(season_id);
CREATE INDEX idx_season_award_predictions_status ON season_award_predictions(status);

ALTER TABLE season_award_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Season award predictions: anyone can read"
  ON season_award_predictions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Season award predictions: users can insert own"
  ON season_award_predictions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Season award predictions: users can update own"
  ON season_award_predictions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Scoring pipeline needs to update status + points_earned
CREATE POLICY "Season award predictions: admin can update"
  ON season_award_predictions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- SEED — default award types for 2026
-- ============================================================
-- Add WDC and WCC as the first two award types.
-- Future awards (most wins, most podiums, best team driver, etc.)
-- are added here, one row each. No code changes required to
-- display new categories once the UI consumes season_award_types.
-- ============================================================

INSERT INTO season_award_types
  (season_id, slug, name, description, subject_type, scope_team_id, points_value, sort_order)
SELECT
  s.id,
  'wdc',
  'World Driver Champion',
  'Which driver will win the Drivers'' Championship?',
  'driver',
  NULL,
  25,
  10
FROM seasons s WHERE s.year = 2026;

INSERT INTO season_award_types
  (season_id, slug, name, description, subject_type, scope_team_id, points_value, sort_order)
SELECT
  s.id,
  'wcc',
  'World Constructor Champion',
  'Which team will win the Constructors'' Championship?',
  'team',
  NULL,
  15,
  20
FROM seasons s WHERE s.year = 2026;

-- ────────────────────────────────────────────────────────────
-- Examples of future award types you can uncomment and insert:
-- ────────────────────────────────────────────────────────────

-- INSERT INTO season_award_types (season_id, slug, name, description, subject_type, points_value, sort_order)
-- SELECT id, 'most_wins',    'Most Race Wins',    'Driver with the most wins this season',    'driver', 10, 30 FROM seasons WHERE year = 2026;

-- INSERT INTO season_award_types (season_id, slug, name, description, subject_type, points_value, sort_order)
-- SELECT id, 'most_podiums', 'Most Podiums',      'Driver with the most podiums this season', 'driver', 10, 40 FROM seasons WHERE year = 2026;

-- INSERT INTO season_award_types (season_id, slug, name, description, subject_type, points_value, sort_order)
-- SELECT id, 'most_dnfs',    'Most DNFs',         'Driver with the most retirements',         'driver', 10, 50 FROM seasons WHERE year = 2026;

-- Best driver per team examples (scope_team_id filters the driver dropdown in the UI):
-- INSERT INTO season_award_types (season_id, slug, name, description, subject_type, scope_team_id, points_value, sort_order)
-- SELECT s.id, 'best_ferrari_driver', 'Best Ferrari Driver', 'Best performing Ferrari driver', 'driver',
--        (SELECT id FROM teams WHERE name = 'Ferrari' AND season_id = s.id), 10, 60
-- FROM seasons s WHERE s.year = 2026;
