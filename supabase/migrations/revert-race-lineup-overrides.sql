-- ============================================================
-- REVERT: Per-race lineup overrides
-- ============================================================
-- Undoes migration-race-lineup-overrides.sql.
--
-- WARNING: this drops every recorded per-race lineup deviation.
-- To undo only ONE weekend's data, run the matching
-- supabase/scripts/lineup-*-revert.sql instead and leave the
-- table in place.
-- ============================================================

DROP TRIGGER IF EXISTS race_lineup_overrides_updated_at ON race_lineup_overrides;
DROP TABLE IF EXISTS race_lineup_overrides;
