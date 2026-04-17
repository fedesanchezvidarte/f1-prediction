import type { Race, RaceStatus, PredictionStatus } from "@/types";

/* ── Pure utility functions — safe for both client & server components ── */

/**
 * Champion prediction deadline phases:
 * - "full"   → before Round 2 starts: submit/update for full points
 * - "half"   → after Round 2 starts, before the close round: submit/update for half points
 * - "closed" → at/after the close round starts: permanently locked
 */
export type ChampionPredictionPhase = "full" | "half" | "closed";

/**
 * The round whose dateStart permanently locks champion predictions.
 * Corresponds to the first race after the summer break (Dutch GP 2026).
 */
export const CHAMPION_CLOSE_ROUND = 14;

/**
 * Determines the current champion prediction phase based on the race calendar.
 *
 * - "full"   → now < Round 2 dateStart (users get 1 race as a hint)
 * - "half"   → Round 2 started but close-round hasn't started yet
 * - "closed" → at or after close-round dateStart (permanently locked)
 */
export function getChampionPredictionPhase(races: Race[]): ChampionPredictionPhase {
  if (races.length === 0) return "closed";

  const sorted = [...races].sort((a, b) => a.round - b.round);
  const now = new Date();

  // Find Round 2
  const round2 = sorted.find((r) => r.round === 2);
  if (!round2 || now < new Date(round2.dateStart)) {
    return "full";
  }

  // Find the close round (first race after summer break)
  const closeRound = sorted.find((r) => r.round === CHAMPION_CLOSE_ROUND);
  if (closeRound && now >= new Date(closeRound.dateStart)) {
    return "closed";
  }

  return "half";
}

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

/* ── Race Calendar helpers ─────────────────────────────────────────── */

export interface RaceCalendarEntry {
  race: Race;
  raceStatus: RaceStatus;
  predictionStatus: PredictionStatus | null;
}

/**
 * Builds a list of calendar entries for every race in the season.
 *
 * @param races - full season race list (any order)
 * @param predictionStatusByMeetingKey - map of meetingKey → PredictionStatus
 * @returns sorted (by round) array of calendar entries
 */
export function getRaceCalendarEntries(
  races: Race[],
  predictionStatusByMeetingKey: Map<number, PredictionStatus>,
): RaceCalendarEntry[] {
  return [...races]
    .sort((a, b) => a.round - b.round)
    .map((race) => ({
      race,
      raceStatus: getRaceStatus(race),
      predictionStatus: predictionStatusByMeetingKey.get(race.meetingKey) ?? null,
    }));
}

/**
 * Converts an ISO 3166-1 alpha-3 country code into a flag emoji.
 * Falls back to a globe emoji for unknown codes.
 */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  AUS: "AU", CHN: "CN", JPN: "JP", BHR: "BH", SAU: "SA", USA: "US",
  MIA: "US", LVG: "US", ESP: "ES", MON: "MC", CAN: "CA", AUT: "AT",
  GBR: "GB", BEL: "BE", HUN: "HU", NLD: "NL", ITA: "IT", AZE: "AZ",
  SGP: "SG", MEX: "MX", BRA: "BR", QAT: "QA", UAE: "AE", ABU: "AE",
  POR: "PT", TUR: "TR", RUS: "RU", IND: "IN", KOR: "KR", MYS: "MY",
  ZAF: "ZA", ARG: "AR", DEU: "DE", FRA: "FR", SWE: "SE",
};

export function countryCodeToFlag(alpha3: string): string {
  const alpha2 = ALPHA3_TO_ALPHA2[alpha3.toUpperCase()];
  if (!alpha2) return "🏁";
  return String.fromCodePoint(
    ...alpha2.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
