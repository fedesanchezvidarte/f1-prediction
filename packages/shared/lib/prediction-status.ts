import type {
  Driver,
  FullRacePrediction,
  RaceResult,
  SprintPrediction,
  SprintResult,
} from "../types";

/** Per-slot prediction match status once a result is known. */
export type MatchStatus = "exact" | "close" | "miss" | null;

/**
 * Driver-based ±1 proximity status, matching the 3/1/0 scoring in lib/scoring.ts.
 * Builds a Map<driverNumber, position> from the ordered result array (positions
 * 0..count-1) plus an optional boundary driver at index `count`, then returns the
 * status for the predicted driver at slot `slotIndex`:
 *   exact → same position; close → off by ±1; miss → otherwise.
 */
export function proximityStatus(
  predicted: Driver | null,
  resultDrivers: Driver[],
  boundaryDriver: Driver | null,
  count: number,
  slotIndex: number
): MatchStatus {
  if (!predicted) return null;
  const driverToPos = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const d = resultDrivers[i];
    if (d && !driverToPos.has(d.driverNumber)) driverToPos.set(d.driverNumber, i);
  }
  if (boundaryDriver && !driverToPos.has(boundaryDriver.driverNumber)) {
    driverToPos.set(boundaryDriver.driverNumber, count);
  }
  if (!driverToPos.has(predicted.driverNumber)) return "miss";
  const delta = Math.abs(driverToPos.get(predicted.driverNumber)! - slotIndex);
  if (delta === 0) return "exact";
  if (delta === 1) return "close";
  return "miss";
}

/** Per-slot match statuses for a race prediction vs the race result. */
export interface RaceMatchStatuses {
  qualifyingTop3: MatchStatus[];
  raceWinner: MatchStatus;
  restOfTop10: MatchStatus[];
  fastestLap: MatchStatus;
  fastestPitStop: MatchStatus;
  driverOfTheDay: MatchStatus;
}

/** Per-slot match statuses for a sprint prediction vs the sprint result. */
export interface SprintMatchStatuses {
  qualifyingTop3: MatchStatus[];
  sprintWinner: MatchStatus;
  restOfTop8: MatchStatus[];
  fastestLap: MatchStatus;
}

/** Exact-only status for single-driver special fields (no proximity). */
function specialFieldStatus(predicted: Driver | null, actual: Driver): MatchStatus {
  if (!predicted) return null;
  if (predicted.driverNumber === actual.driverNumber) return "exact";
  return null;
}

/**
 * Computes the per-slot match statuses of a race prediction against the race
 * result: driver-based ±1 proximity for the top-10 (P11 boundary) and
 * qualifying top-3 (Q4 boundary); exact-only for the special fields, which
 * stay `null` when the result doesn't include that field.
 */
export function computeRaceMatchStatuses(
  prediction: FullRacePrediction,
  result: RaceResult
): RaceMatchStatuses {
  const top10Status = (predicted: Driver | null, slotIndex: number): MatchStatus =>
    proximityStatus(predicted, result.top10, result.p11 ?? null, 10, slotIndex);

  return {
    qualifyingTop3: prediction.qualifyingTop3.map((predicted, i) =>
      proximityStatus(predicted, result.qualifyingTop3, result.qualifyingP4 ?? null, 3, i)
    ),
    raceWinner: top10Status(prediction.raceWinner, 0),
    restOfTop10: prediction.restOfTop10.map((predicted, i) => top10Status(predicted, i + 1)),
    fastestLap: specialFieldStatus(prediction.fastestLap, result.fastestLap),
    fastestPitStop: result.fastestPitStop
      ? specialFieldStatus(prediction.fastestPitStop, result.fastestPitStop)
      : null,
    driverOfTheDay: result.driverOfTheDay
      ? specialFieldStatus(prediction.driverOfTheDay, result.driverOfTheDay)
      : null,
  };
}

/**
 * Computes the per-slot match statuses of a sprint prediction against the
 * sprint result: driver-based ±1 proximity for the top-8 (P9 boundary) and
 * sprint qualifying top-3 (Q4 boundary); exact-only for the fastest lap.
 */
export function computeSprintMatchStatuses(
  prediction: SprintPrediction,
  result: SprintResult
): SprintMatchStatuses {
  const top8Status = (predicted: Driver | null, slotIndex: number): MatchStatus =>
    proximityStatus(predicted, result.top8, result.p9 ?? null, 8, slotIndex);

  return {
    qualifyingTop3: prediction.qualifyingTop3.map((predicted, i) =>
      proximityStatus(predicted, result.qualifyingTop3, result.qualifyingP4 ?? null, 3, i)
    ),
    sprintWinner: top8Status(prediction.sprintWinner, 0),
    restOfTop8: prediction.restOfTop8.map((predicted, i) => top8Status(predicted, i + 1)),
    fastestLap: specialFieldStatus(prediction.fastestLap, result.fastestLap),
  };
}
