-- Migration: Add DNF tracking to race_results
-- Issue: #61 — Driver Stats Counter (DNFs / Wins / Podiums)

ALTER TABLE race_results
  ADD COLUMN IF NOT EXISTS dnf_driver_ids JSONB DEFAULT NULL;

COMMENT ON COLUMN race_results.dnf_driver_ids IS 'Array of driver IDs that did not finish (DNF) the race';
