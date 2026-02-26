import type { Race, RaceStatus } from "@/types";

/* ── Pure utility functions — safe for both client & server components ── */

export function getRaceStatus(race: Race): RaceStatus {
  const now = new Date();
  const start = new Date(race.dateStart);
  const end = new Date(race.dateEnd);
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "completed";
}

export function getNextRace(races: Race[]): Race | undefined {
  const now = new Date();
  return races.find((race) => new Date(race.dateEnd) > now);
}

/**
 * Returns up to 3 races for the predictions card:
 * - Slot 1: live race (if any)
 * - Remaining slots: upcoming races (chronological)
 * Always returns exactly 3 items; null means an empty placeholder slot.
 */
export function getPredictionCardRaces(races: Race[]): (Race | null)[] {
  const now = new Date();
  const live = races.find(
    (r) => now >= new Date(r.dateStart) && now <= new Date(r.dateEnd),
  );
  const upcoming = races.filter((r) => new Date(r.dateStart) > now);

  const slots: (Race | null)[] = [];
  if (live) slots.push(live);
  for (const r of upcoming) {
    if (slots.length >= 3) break;
    slots.push(r);
  }
  while (slots.length < 3) slots.push(null);
  return slots;
}
