-- ============================================================
-- MIGRATION: Per-race lineup overrides
-- ============================================================
-- The schema had no way to express a one-weekend lineup change:
-- `drivers.team_id` is a single mutable column and `drivers.is_active`
-- is one boolean per SEASON. Changing either retroactively rewrites
-- the whole season (constructor standings are bucketed by the live
-- `drivers.team_id`), and there was no notion of a driver being
-- unavailable for a single race.
--
-- This table records, per (race, driver):
--   * `is_unavailable` — the driver is not on the grid for that race,
--     so they are shown but not selectable in the prediction pickers.
--   * `team_id`        — the driver races for a DIFFERENT team for that
--     race only. Constructor points for that race are attributed here
--     instead of to `drivers.team_id`. NULL means "no team override".
--
-- Driver (WDC) points are never affected — they always stay with the
-- driver. Only constructor (WCC) attribution and the prediction pickers
-- read this table.
--
-- IMPORTANT: Run this migration in the Supabase SQL editor.
-- Paired revert: revert-race-lineup-overrides.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS race_lineup_overrides (
  id              SERIAL PRIMARY KEY,
  race_id         INTEGER NOT NULL REFERENCES races(id)   ON DELETE CASCADE,
  driver_id       INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  is_unavailable  BOOLEAN NOT NULL DEFAULT FALSE,
  team_id         INTEGER          REFERENCES teams(id)   ON DELETE SET NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (race_id, driver_id),
  -- A row must say something: either the driver is out, or they moved team.
  CONSTRAINT race_lineup_overrides_not_empty
    CHECK (is_unavailable OR team_id IS NOT NULL)
);

COMMENT ON TABLE  race_lineup_overrides IS 'Per-race deviations from the season lineup: driver unavailable for a race, and/or racing for a different team that race only.';
COMMENT ON COLUMN race_lineup_overrides.is_unavailable IS 'TRUE = driver is not on the grid for this race (shown but unselectable in pickers).';
COMMENT ON COLUMN race_lineup_overrides.team_id IS 'Team the driver races for at THIS race. NULL = no override, use drivers.team_id. Constructor points for this race go here.';
COMMENT ON COLUMN race_lineup_overrides.note IS 'Free-text reason, shown in the admin panel (e.g. "Out — Dutch GP 2026").';

CREATE INDEX IF NOT EXISTS idx_race_lineup_overrides_race_id
  ON race_lineup_overrides(race_id);
CREATE INDEX IF NOT EXISTS idx_race_lineup_overrides_driver_id
  ON race_lineup_overrides(driver_id);

DROP TRIGGER IF EXISTS race_lineup_overrides_updated_at ON race_lineup_overrides;
CREATE TRIGGER race_lineup_overrides_updated_at
  BEFORE UPDATE ON race_lineup_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ───────────────────────────────────────────────────────
-- Read-only for clients, exactly like the other reference data
-- (teams, drivers). Every write goes through an admin API route
-- using the service_role client, which bypasses RLS.

ALTER TABLE race_lineup_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Race lineup overrides: anyone can read"
  ON race_lineup_overrides;
CREATE POLICY "Race lineup overrides: anyone can read"
  ON race_lineup_overrides FOR SELECT
  TO authenticated
  USING (true);
