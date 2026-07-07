/**
 * Scoring engine for F1 predictions (New Points System — Issue #76).
 *
 * Positions are scored 3 (exact) / 1 (±1 proximity, driver-based) / 0.
 * Specials (fastest lap, fastest pit stop, driver of the day) = 1 (exact only).
 * Bonuses are exact/any-order, perfect and imperfect mutually exclusive.
 *
 * Race max:   92 pts = 30 (10×3 top-10) + 9 (3×3 quali) + 3 (FL+FPS+DOTD)
 *                      + 10 (podium) + 30 (top-10) + 10 (quali bonus)
 * Sprint max: 78 pts = 24 (8×3 top-8) + 9 (3×3 quali) + 1 (FL)
 *                      + 10 (podium) + 24 (top-8) + 10 (quali bonus)
 * Championship max: 92 pts (unchanged — 20/10 scale)
 */

export interface RaceScoringInput {
  predTop10: (number | null)[];      // [P1, P2, ..., P10] driver IDs
  predQualifyingTop3: (number | null)[]; // [Q1, Q2, Q3] driver IDs (Q1 = pole)
  predFastestLap: number | null;
  predFastestPitStop: number | null;
  predDriverOfTheDay: number | null;
  resultTop10: number[];              // [P1, P2, ..., P10] driver IDs
  resultP11: number | null;           // boundary slot for ±1 proximity on P10
  resultQualifyingTop3: number[];     // [Q1, Q2, Q3] driver IDs
  resultQualifyingP4: number | null;  // boundary slot for ±1 proximity on Q3
  resultFastestLap: number;
  resultFastestPitStop: number;
  resultDriverOfTheDay: number | null;
}

export interface SprintScoringInput {
  predTop8: (number | null)[];       // [P1, P2, ..., P8] driver IDs
  predQualifyingTop3: (number | null)[]; // [Q1, Q2, Q3] driver IDs (Q1 = sprint pole)
  predFastestLap: number | null;
  resultTop8: number[];              // [P1, P2, ..., P8] driver IDs
  resultP9: number | null;           // boundary slot for ±1 proximity on P8
  resultQualifyingTop3: number[];    // [Q1, Q2, Q3] driver IDs
  resultQualifyingP4: number | null; // boundary slot for ±1 proximity on Q3
  resultFastestLap: number;
}

export interface ChampionScoringInput {
  predWdc: number | null;
  predWcc: number | null;            // team ID
  predMostDnfs: number | null;
  predMostPodiums: number | null;
  predMostWins: number | null;
  resultWdc: number;
  resultWcc: number;                 // team ID
  resultMostDnfs: number | null;
  resultMostPodiums: number | null;
  resultMostWins: number | null;
  isHalfPoints: boolean;
}

export interface ScoringBreakdown {
  /** Count of exact position matches in the race/sprint top-N (used for achievements & "correct" tally). */
  positionMatches: number;
  /** Points from race/sprint top-N positions (3 exact / 1 proximity per slot). */
  positionPoints: number;
  /** Q1 exact match (= the legacy pole). Kept for predict_pole / hat-trick achievements. */
  poleMatch: boolean;
  /** Count of exact qualifying-slot matches (Q1-Q3). */
  qualifyingPositionMatches: number;
  /** Points from qualifying top-3 positions (3 exact / 1 proximity per slot). */
  qualifyingPoints: number;
  /** Qualifying top-3 exact order bonus earned. */
  perfectQualifying: boolean;
  /** Qualifying top-3 any-order bonus earned (only when not perfect). */
  matchQualifying: boolean;
  fastestLapMatch: boolean;
  fastestPitStopMatch?: boolean;
  driverOfTheDayMatch?: boolean;
  perfectPodium: boolean;
  matchPodium: boolean;
  perfectTopN: boolean;
  matchTopN: boolean;
  total: number;
}

export interface ChampionScoringBreakdown {
  wdcMatch: boolean;
  wccMatch: boolean;
  mostDnfsMatch: boolean;
  mostPodiumsMatch: boolean;
  mostWinsMatch: boolean;
  isHalfPoints: boolean;
  total: number;
}

// Bonus comparators. A bonus requires a FULL set of valid (non-null) entries
// on BOTH sides of the [start, end) range. `== null` (not `=== null`) is used
// deliberately so that `undefined` — e.g. a legacy row whose backfilled
// qualifying_top_3 is a short `[pole]` array — is treated as a non-match and
// never satisfies the bonus. (See Issue #76: legacy data only scores Q1, the
// quali top-3 bonus must NOT apply retroactively.)
function arraysMatchExact(pred: (number | null)[], result: number[], start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    if (pred[i] == null || result[i] == null || pred[i] !== result[i]) return false;
  }
  return true;
}

function arraysMatchAnyOrder(pred: (number | null)[], result: number[], start: number, end: number): boolean {
  const span = end - start;
  const predSlice = pred.slice(start, end);
  const resultSlice = result.slice(start, end);
  // Both sides must have a complete, fully-populated range.
  if (predSlice.length < span || resultSlice.length < span) return false;
  if (predSlice.some((id) => id == null)) return false;
  if (resultSlice.some((id) => id == null)) return false;
  const predSet = new Set(predSlice as number[]);
  const resultSet = new Set(resultSlice);
  if (predSet.size !== resultSet.size) return false;
  for (const id of predSet) {
    if (!resultSet.has(id)) return false;
  }
  return true;
}

/* ── Point values (New Points System — Issue #76) ──────────────────── */
export const POINTS_EXACT = 3;
export const POINTS_PROXIMITY = 1;
export const POINTS_SPECIAL = 1;
export const RACE_PODIUM_PERFECT = 10;
export const RACE_PODIUM_MATCH = 5;
export const RACE_TOP10_PERFECT = 30;
export const RACE_TOP10_MATCH = 15;
export const SPRINT_PODIUM_PERFECT = 10;
export const SPRINT_PODIUM_MATCH = 5;
export const SPRINT_TOP8_PERFECT = 24;
export const SPRINT_TOP8_MATCH = 12;
export const QUALI_PERFECT = 10;
export const QUALI_MATCH = 5;

export interface PositionScore {
  /** Per-slot points awarded: 3 (exact), 1 (±1 proximity), or 0. */
  perPosition: number[];
  /** Sum of perPosition. */
  positionPoints: number;
  /** Count of slots that were exact matches (per-slot === 3). */
  exactCount: number;
}

/**
 * Driver-based proximity scoring.
 *
 * Builds a `Map<driverId, actualPosition>` from the ordered result array
 * (positions 0..count-1) plus an optional boundary driver at index `count`
 * (the slot just past the predicted range — supplies the +1 case for the
 * last predicted slot). Then for each predicted slot `i` in [0, count):
 *   - predicted driver null / not in map → 0
 *   - actual position === i              → 3 (exact)
 *   - |actual − i| === 1                 → 1 (proximity)
 *   - else                               → 0
 *
 * Identical logic for race top-10, sprint top-8, and qualifying top-3.
 */
export function scorePositions(
  pred: (number | null)[],
  result: number[],
  boundaryDriver: number | null,
  count: number
): PositionScore {
  // Map each finishing driver to their actual position index.
  // First occurrence wins (guards against malformed duplicate data).
  const driverToPos = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    const id = result[i];
    if (id != null && !driverToPos.has(id)) driverToPos.set(id, i);
  }
  if (boundaryDriver != null && !driverToPos.has(boundaryDriver)) {
    driverToPos.set(boundaryDriver, count);
  }

  const perPosition: number[] = [];
  let positionPoints = 0;
  let exactCount = 0;

  for (let i = 0; i < count; i++) {
    const predicted = pred[i] ?? null;
    let slot = 0;
    if (predicted != null && driverToPos.has(predicted)) {
      const actual = driverToPos.get(predicted)!;
      const delta = Math.abs(actual - i);
      if (delta === 0) {
        slot = POINTS_EXACT;
        exactCount++;
      } else if (delta === 1) {
        slot = POINTS_PROXIMITY;
      }
    }
    perPosition.push(slot);
    positionPoints += slot;
  }

  return { perPosition, positionPoints, exactCount };
}

export function scoreRacePrediction(input: RaceScoringInput): ScoringBreakdown {
  const {
    predTop10,
    predQualifyingTop3,
    predFastestLap,
    predFastestPitStop,
    predDriverOfTheDay,
    resultTop10,
    resultP11,
    resultQualifyingTop3,
    resultQualifyingP4,
    resultFastestLap,
    resultFastestPitStop,
    resultDriverOfTheDay,
  } = input;

  const top10Score = scorePositions(predTop10, resultTop10, resultP11, 10);
  const qualiScore = scorePositions(predQualifyingTop3, resultQualifyingTop3, resultQualifyingP4, 3);

  const positionMatches = top10Score.exactCount;
  const positionPoints = top10Score.positionPoints;
  const qualifyingPositionMatches = qualiScore.exactCount;
  const qualifyingPoints = qualiScore.positionPoints;

  // Q1 exact match = the legacy pole (kept for achievements).
  const poleMatch =
    predQualifyingTop3[0] != null && predQualifyingTop3[0] === resultQualifyingTop3[0];

  const fastestLapMatch = predFastestLap !== null && predFastestLap === resultFastestLap;
  const fastestPitStopMatch = predFastestPitStop !== null && predFastestPitStop === resultFastestPitStop;
  const driverOfTheDayMatch = predDriverOfTheDay !== null && resultDriverOfTheDay !== null && predDriverOfTheDay === resultDriverOfTheDay;

  const perfectPodium = arraysMatchExact(predTop10, resultTop10, 0, 3);
  const matchPodium = !perfectPodium && arraysMatchAnyOrder(predTop10, resultTop10, 0, 3);
  const perfectTopN = arraysMatchExact(predTop10, resultTop10, 0, 10);
  const matchTopN = !perfectTopN && arraysMatchAnyOrder(predTop10, resultTop10, 0, 10);

  const perfectQualifying = arraysMatchExact(predQualifyingTop3, resultQualifyingTop3, 0, 3);
  const matchQualifying = !perfectQualifying && arraysMatchAnyOrder(predQualifyingTop3, resultQualifyingTop3, 0, 3);

  let total = positionPoints + qualifyingPoints;
  if (fastestLapMatch) total += POINTS_SPECIAL;
  if (fastestPitStopMatch) total += POINTS_SPECIAL;
  if (driverOfTheDayMatch) total += POINTS_SPECIAL;
  if (perfectPodium) total += RACE_PODIUM_PERFECT;
  else if (matchPodium) total += RACE_PODIUM_MATCH;
  if (perfectTopN) total += RACE_TOP10_PERFECT;
  else if (matchTopN) total += RACE_TOP10_MATCH;
  if (perfectQualifying) total += QUALI_PERFECT;
  else if (matchQualifying) total += QUALI_MATCH;

  return {
    positionMatches,
    positionPoints,
    poleMatch,
    qualifyingPositionMatches,
    qualifyingPoints,
    perfectQualifying,
    matchQualifying,
    fastestLapMatch,
    fastestPitStopMatch,
    driverOfTheDayMatch,
    perfectPodium,
    matchPodium,
    perfectTopN,
    matchTopN,
    total,
  };
}

export function scoreSprintPrediction(input: SprintScoringInput): ScoringBreakdown {
  const {
    predTop8,
    predQualifyingTop3,
    predFastestLap,
    resultTop8,
    resultP9,
    resultQualifyingTop3,
    resultQualifyingP4,
    resultFastestLap,
  } = input;

  const top8Score = scorePositions(predTop8, resultTop8, resultP9, 8);
  const qualiScore = scorePositions(predQualifyingTop3, resultQualifyingTop3, resultQualifyingP4, 3);

  const positionMatches = top8Score.exactCount;
  const positionPoints = top8Score.positionPoints;
  const qualifyingPositionMatches = qualiScore.exactCount;
  const qualifyingPoints = qualiScore.positionPoints;

  const poleMatch =
    predQualifyingTop3[0] != null && predQualifyingTop3[0] === resultQualifyingTop3[0];

  const fastestLapMatch = predFastestLap !== null && predFastestLap === resultFastestLap;

  const perfectPodium = arraysMatchExact(predTop8, resultTop8, 0, 3);
  const matchPodium = !perfectPodium && arraysMatchAnyOrder(predTop8, resultTop8, 0, 3);
  const perfectTopN = arraysMatchExact(predTop8, resultTop8, 0, 8);
  const matchTopN = !perfectTopN && arraysMatchAnyOrder(predTop8, resultTop8, 0, 8);

  const perfectQualifying = arraysMatchExact(predQualifyingTop3, resultQualifyingTop3, 0, 3);
  const matchQualifying = !perfectQualifying && arraysMatchAnyOrder(predQualifyingTop3, resultQualifyingTop3, 0, 3);

  let total = positionPoints + qualifyingPoints;
  if (fastestLapMatch) total += POINTS_SPECIAL;
  if (perfectPodium) total += SPRINT_PODIUM_PERFECT;
  else if (matchPodium) total += SPRINT_PODIUM_MATCH;
  if (perfectTopN) total += SPRINT_TOP8_PERFECT;
  else if (matchTopN) total += SPRINT_TOP8_MATCH;
  if (perfectQualifying) total += QUALI_PERFECT;
  else if (matchQualifying) total += QUALI_MATCH;

  return {
    positionMatches,
    positionPoints,
    poleMatch,
    qualifyingPositionMatches,
    qualifyingPoints,
    perfectQualifying,
    matchQualifying,
    fastestLapMatch,
    perfectPodium,
    matchPodium,
    perfectTopN,
    matchTopN,
    total,
  };
}

export function scoreChampionPrediction(input: ChampionScoringInput): ChampionScoringBreakdown {
  const { predWdc, predWcc, predMostDnfs, predMostPodiums, predMostWins, resultWdc, resultWcc, resultMostDnfs, resultMostPodiums, resultMostWins, isHalfPoints } = input;

  const wdcMatch = predWdc !== null && predWdc === resultWdc;
  const wccMatch = predWcc !== null && predWcc === resultWcc;
  const mostDnfsMatch = predMostDnfs !== null && resultMostDnfs !== null && predMostDnfs === resultMostDnfs;
  const mostPodiumsMatch = predMostPodiums !== null && resultMostPodiums !== null && predMostPodiums === resultMostPodiums;
  const mostWinsMatch = predMostWins !== null && resultMostWins !== null && predMostWins === resultMostWins;

  let total = 0;
  if (wdcMatch) total += 20;
  if (wccMatch) total += 20;
  if (mostDnfsMatch) total += 10;
  if (mostPodiumsMatch) total += 10;
  if (mostWinsMatch) total += 10;
  if (isHalfPoints) total = Math.floor(total / 2);

  return { wdcMatch, wccMatch, mostDnfsMatch, mostPodiumsMatch, mostWinsMatch, isHalfPoints, total };
}

/* ── Per-field point breakdowns (for UI display) ───────────────────── */

export interface RaceFieldPoints {
  /** Per-slot points for the qualifying top-3 [Q1, Q2, Q3] (3 exact / 1 ±1 / 0). */
  qualifyingTop3: number[];
  /** Race winner (P1) slot points (3 exact / 1 ±1 / 0). */
  raceWinner: number;
  /** P2..P10 slot points (3 exact / 1 ±1 / 0). */
  restOfTop10: number[];
  fastestLap: number;
  fastestPitStop: number;
  driverOfTheDay: number;
  perfectPodiumBonus: number;
  matchPodiumBonus: number;
  perfectTop10Bonus: number;
  matchTop10Bonus: number;
  perfectQualifyingBonus: number;
  matchQualifyingBonus: number;
  total: number;
}

export interface SprintFieldPoints {
  /** Per-slot points for the qualifying top-3 [Q1, Q2, Q3] (3 exact / 1 ±1 / 0). */
  qualifyingTop3: number[];
  /** Sprint winner (P1) slot points (3 exact / 1 ±1 / 0). */
  sprintWinner: number;
  /** P2..P8 slot points (3 exact / 1 ±1 / 0). */
  restOfTop8: number[];
  fastestLap: number;
  perfectPodiumBonus: number;
  matchPodiumBonus: number;
  perfectTop8Bonus: number;
  matchTop8Bonus: number;
  perfectQualifyingBonus: number;
  matchQualifyingBonus: number;
  total: number;
}

export function computeRaceFieldPoints(input: RaceScoringInput): RaceFieldPoints {
  const breakdown = scoreRacePrediction(input);
  const { predTop10, predQualifyingTop3, resultTop10, resultP11, resultQualifyingTop3, resultQualifyingP4 } = input;

  const top10Score = scorePositions(predTop10, resultTop10, resultP11, 10);
  const qualiScore = scorePositions(predQualifyingTop3, resultQualifyingTop3, resultQualifyingP4, 3);

  return {
    qualifyingTop3: qualiScore.perPosition,
    raceWinner: top10Score.perPosition[0] ?? 0,
    restOfTop10: top10Score.perPosition.slice(1),
    fastestLap: breakdown.fastestLapMatch ? POINTS_SPECIAL : 0,
    fastestPitStop: breakdown.fastestPitStopMatch ? POINTS_SPECIAL : 0,
    driverOfTheDay: breakdown.driverOfTheDayMatch ? POINTS_SPECIAL : 0,
    perfectPodiumBonus: breakdown.perfectPodium ? RACE_PODIUM_PERFECT : 0,
    matchPodiumBonus: breakdown.matchPodium ? RACE_PODIUM_MATCH : 0,
    perfectTop10Bonus: breakdown.perfectTopN ? RACE_TOP10_PERFECT : 0,
    matchTop10Bonus: breakdown.matchTopN ? RACE_TOP10_MATCH : 0,
    perfectQualifyingBonus: breakdown.perfectQualifying ? QUALI_PERFECT : 0,
    matchQualifyingBonus: breakdown.matchQualifying ? QUALI_MATCH : 0,
    total: breakdown.total,
  };
}

export function computeSprintFieldPoints(input: SprintScoringInput): SprintFieldPoints {
  const breakdown = scoreSprintPrediction(input);
  const { predTop8, predQualifyingTop3, resultTop8, resultP9, resultQualifyingTop3, resultQualifyingP4 } = input;

  const top8Score = scorePositions(predTop8, resultTop8, resultP9, 8);
  const qualiScore = scorePositions(predQualifyingTop3, resultQualifyingTop3, resultQualifyingP4, 3);

  return {
    qualifyingTop3: qualiScore.perPosition,
    sprintWinner: top8Score.perPosition[0] ?? 0,
    restOfTop8: top8Score.perPosition.slice(1),
    fastestLap: breakdown.fastestLapMatch ? POINTS_SPECIAL : 0,
    perfectPodiumBonus: breakdown.perfectPodium ? SPRINT_PODIUM_PERFECT : 0,
    matchPodiumBonus: breakdown.matchPodium ? SPRINT_PODIUM_MATCH : 0,
    perfectTop8Bonus: breakdown.perfectTopN ? SPRINT_TOP8_PERFECT : 0,
    matchTop8Bonus: breakdown.matchTopN ? SPRINT_TOP8_MATCH : 0,
    perfectQualifyingBonus: breakdown.perfectQualifying ? QUALI_PERFECT : 0,
    matchQualifyingBonus: breakdown.matchQualifying ? QUALI_MATCH : 0,
    total: breakdown.total,
  };
}

/* ── Season Award scoring (unified model) ──────────────────────────── */

export interface SeasonAwardScoringInput {
  predValue: number | null;   // driver_id or team_id
  resultValue: number | null;
  pointsValue: number;        // from season_award_types.points_value
  isHalfPoints: boolean;      // from season_award_predictions.is_half_points
}

export interface SeasonAwardScoringBreakdown {
  isMatch: boolean;
  isHalfPoints: boolean;
  points: number;
}

export function scoreSeasonAward(input: SeasonAwardScoringInput): SeasonAwardScoringBreakdown {
  const isMatch =
    input.predValue !== null &&
    input.resultValue !== null &&
    input.predValue === input.resultValue;
  const points = isMatch
    ? input.isHalfPoints ? Math.floor(input.pointsValue / 2) : input.pointsValue
    : 0;
  return { isMatch, isHalfPoints: input.isHalfPoints, points };
}
