/**
 * Scoring engine for F1 predictions.
 *
 * Race max: 42 pts | Sprint max: 20 pts | Championship max: 40 pts
 */

export interface RaceScoringInput {
  predTop10: (number | null)[];      // [P1, P2, ..., P10] driver IDs
  predPole: number | null;
  predFastestLap: number | null;
  predFastestPitStop: number | null;
  predDriverOfTheDay: number | null;
  resultTop10: number[];              // [P1, P2, ..., P10] driver IDs
  resultPole: number;
  resultFastestLap: number;
  resultFastestPitStop: number;
  resultDriverOfTheDay: number | null;
}

export interface SprintScoringInput {
  predTop8: (number | null)[];       // [P1, P2, ..., P8] driver IDs
  predSprintPole: number | null;
  predFastestLap: number | null;
  resultTop8: number[];              // [P1, P2, ..., P8] driver IDs
  resultSprintPole: number;
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
  positionMatches: number;
  poleMatch: boolean;
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

function arraysMatchExact(pred: (number | null)[], result: number[], start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    if (pred[i] === null || pred[i] !== result[i]) return false;
  }
  return true;
}

function arraysMatchAnyOrder(pred: (number | null)[], result: number[], start: number, end: number): boolean {
  const predSlice = pred.slice(start, end);
  if (predSlice.some((id) => id === null)) return false;
  const predSet = new Set(predSlice as number[]);
  const resultSet = new Set(result.slice(start, end));
  if (predSet.size !== resultSet.size) return false;
  for (const id of predSet) {
    if (!resultSet.has(id)) return false;
  }
  return true;
}

export function scoreRacePrediction(input: RaceScoringInput): ScoringBreakdown {
  const { predTop10, predPole, predFastestLap, predFastestPitStop, predDriverOfTheDay, resultTop10, resultPole, resultFastestLap, resultFastestPitStop, resultDriverOfTheDay } = input;

  let positionMatches = 0;
  for (let i = 0; i < 10; i++) {
    if (predTop10[i] !== null && predTop10[i] === resultTop10[i]) {
      positionMatches++;
    }
  }

  const poleMatch = predPole !== null && predPole === resultPole;
  const fastestLapMatch = predFastestLap !== null && predFastestLap === resultFastestLap;
  const fastestPitStopMatch = predFastestPitStop !== null && predFastestPitStop === resultFastestPitStop;
  const driverOfTheDayMatch = predDriverOfTheDay !== null && resultDriverOfTheDay !== null && predDriverOfTheDay === resultDriverOfTheDay;

  const perfectPodium = arraysMatchExact(predTop10, resultTop10, 0, 3);
  const matchPodium = !perfectPodium && arraysMatchAnyOrder(predTop10, resultTop10, 0, 3);
  const perfectTopN = arraysMatchExact(predTop10, resultTop10, 0, 10);
  const matchTopN = !perfectTopN && arraysMatchAnyOrder(predTop10, resultTop10, 0, 10);

  let total = positionMatches;
  if (poleMatch) total += 1;
  if (fastestLapMatch) total += 1;
  if (fastestPitStopMatch) total += 1;
  if (driverOfTheDayMatch) total += 1;
  if (perfectPodium) total += 10;
  else if (matchPodium) total += 5;
  if (perfectTopN) total += 10;
  else if (matchTopN) total += 5;

  return {
    positionMatches,
    poleMatch,
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
  const { predTop8, predSprintPole, predFastestLap, resultTop8, resultSprintPole, resultFastestLap } = input;

  let positionMatches = 0;
  for (let i = 0; i < 8; i++) {
    if (predTop8[i] !== null && predTop8[i] === resultTop8[i]) {
      positionMatches++;
    }
  }

  const poleMatch = predSprintPole !== null && predSprintPole === resultSprintPole;
  const fastestLapMatch = predFastestLap !== null && predFastestLap === resultFastestLap;

  const perfectPodium = arraysMatchExact(predTop8, resultTop8, 0, 3);
  const matchPodium = !perfectPodium && arraysMatchAnyOrder(predTop8, resultTop8, 0, 3);
  const perfectTopN = arraysMatchExact(predTop8, resultTop8, 0, 8);
  const matchTopN = !perfectTopN && arraysMatchAnyOrder(predTop8, resultTop8, 0, 8);

  let total = positionMatches;
  if (poleMatch) total += 1;
  if (fastestLapMatch) total += 1;
  if (perfectPodium) total += 5;
  else if (matchPodium) total += 2;
  if (perfectTopN) total += 5;
  else if (matchTopN) total += 2;

  return {
    positionMatches,
    poleMatch,
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
  polePosition: number;
  raceWinner: number;
  restOfTop10: number[];
  fastestLap: number;
  fastestPitStop: number;
  driverOfTheDay: number;
  perfectPodiumBonus: number;
  matchPodiumBonus: number;
  perfectTop10Bonus: number;
  matchTop10Bonus: number;
  total: number;
}

export interface SprintFieldPoints {
  sprintPole: number;
  sprintWinner: number;
  restOfTop8: number[];
  fastestLap: number;
  perfectPodiumBonus: number;
  matchPodiumBonus: number;
  perfectTop8Bonus: number;
  matchTop8Bonus: number;
  total: number;
}

export function computeRaceFieldPoints(input: RaceScoringInput): RaceFieldPoints {
  const breakdown = scoreRacePrediction(input);
  const { predTop10, resultTop10 } = input;

  const raceWinner =
    predTop10[0] !== null && predTop10[0] === resultTop10[0] ? 1 : 0;

  const restOfTop10: number[] = [];
  for (let i = 1; i < 10; i++) {
    restOfTop10.push(
      predTop10[i] !== null && predTop10[i] === resultTop10[i] ? 1 : 0
    );
  }

  return {
    polePosition: breakdown.poleMatch ? 1 : 0,
    raceWinner,
    restOfTop10,
    fastestLap: breakdown.fastestLapMatch ? 1 : 0,
    fastestPitStop: breakdown.fastestPitStopMatch ? 1 : 0,
    driverOfTheDay: breakdown.driverOfTheDayMatch ? 1 : 0,
    perfectPodiumBonus: breakdown.perfectPodium ? 10 : 0,
    matchPodiumBonus: breakdown.matchPodium ? 5 : 0,
    perfectTop10Bonus: breakdown.perfectTopN ? 10 : 0,
    matchTop10Bonus: breakdown.matchTopN ? 5 : 0,
    total: breakdown.total,
  };
}

export function computeSprintFieldPoints(input: SprintScoringInput): SprintFieldPoints {
  const breakdown = scoreSprintPrediction(input);
  const { predTop8, resultTop8 } = input;

  const sprintWinner =
    predTop8[0] !== null && predTop8[0] === resultTop8[0] ? 1 : 0;

  const restOfTop8: number[] = [];
  for (let i = 1; i < 8; i++) {
    restOfTop8.push(
      predTop8[i] !== null && predTop8[i] === resultTop8[i] ? 1 : 0
    );
  }

  return {
    sprintPole: breakdown.poleMatch ? 1 : 0,
    sprintWinner,
    restOfTop8,
    fastestLap: breakdown.fastestLapMatch ? 1 : 0,
    perfectPodiumBonus: breakdown.perfectPodium ? 5 : 0,
    matchPodiumBonus: breakdown.matchPodium ? 2 : 0,
    perfectTop8Bonus: breakdown.perfectTopN ? 5 : 0,
    matchTop8Bonus: breakdown.matchTopN ? 2 : 0,
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
