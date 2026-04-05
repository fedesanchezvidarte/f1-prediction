-- Migration: Separate sprint prediction deadline
-- Issue #60: Creates separate deadlines for Sprint and Normal Races
--
-- Adds sprint_date_end column to races table.
-- For sprint weekends, this stores the Sprint Qualifying start time
-- (sprint prediction deadline), while date_end stores the Qualifying
-- start time (race prediction deadline).

ALTER TABLE races ADD COLUMN IF NOT EXISTS sprint_date_end timestamptz;

COMMENT ON COLUMN races.sprint_date_end IS
  'Sprint prediction deadline (Sprint Qualifying start). Only set for sprint weekends. Race predictions use date_end (Qualifying start).';
