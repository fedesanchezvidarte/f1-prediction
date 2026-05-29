/**
 * Tests for lib/scoring.ts — the heart of the F1 prediction scoring engine
 * (New Points System — Issue #76).
 *
 * Positions: 3 (exact) / 1 (±1 proximity, driver-based) / 0.
 * Specials (FL, FPS, DOTD): 1 (exact only).
 * Bonuses: podium 10/5, race top-10 30/15, sprint top-8 24/12, qualifying 10/5.
 *
 * Race perfect = 92, Sprint perfect = 78, Championship max = 92 (unchanged).
 */
import {
  scoreRacePrediction,
  scoreSprintPrediction,
  scoreChampionPrediction,
  scorePositions,
  computeRaceFieldPoints,
  computeSprintFieldPoints,
  type RaceScoringInput,
  type SprintScoringInput,
  type ChampionScoringInput,
} from "@/lib/scoring";

/* ═══════════════════════════════════════════════════════════════════════
   Helpers: build default inputs with overrides
   ═══════════════════════════════════════════════════════════════════════ */
function makeRaceInput(overrides: Partial<RaceScoringInput> = {}): RaceScoringInput {
  return {
    predTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    predQualifyingTop3: [1, 2, 3],
    predFastestLap: 2,
    predFastestPitStop: 3,
    predDriverOfTheDay: 4,
    resultTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    resultP11: 11,
    resultQualifyingTop3: [1, 2, 3],
    resultQualifyingP4: 4,
    resultFastestLap: 2,
    resultFastestPitStop: 3,
    resultDriverOfTheDay: 4,
    ...overrides,
  };
}

function makeSprintInput(overrides: Partial<SprintScoringInput> = {}): SprintScoringInput {
  return {
    predTop8: [1, 2, 3, 4, 5, 6, 7, 8],
    predQualifyingTop3: [1, 2, 3],
    predFastestLap: 2,
    resultTop8: [1, 2, 3, 4, 5, 6, 7, 8],
    resultP9: 9,
    resultQualifyingTop3: [1, 2, 3],
    resultQualifyingP4: 4,
    resultFastestLap: 2,
    ...overrides,
  };
}

function makeChampionInput(overrides: Partial<ChampionScoringInput> = {}): ChampionScoringInput {
  return {
    predWdc: 1,
    predWcc: 100,
    predMostDnfs: 2,
    predMostPodiums: 3,
    predMostWins: 4,
    resultWdc: 1,
    resultWcc: 100,
    resultMostDnfs: 2,
    resultMostPodiums: 3,
    resultMostWins: 4,
    isHalfPoints: false,
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   scorePositions — the driver-based proximity helper
   ═══════════════════════════════════════════════════════════════════════ */
describe("scorePositions", () => {
  it("awards 3 for an exact position match", () => {
    const s = scorePositions([1, 2, 3], [1, 2, 3], null, 3);
    expect(s.perPosition).toEqual([3, 3, 3]);
    expect(s.positionPoints).toBe(9);
    expect(s.exactCount).toBe(3);
  });

  it("awards 1 for a ±1 proximity (driver finished one place off)", () => {
    // Predicted RUS at P1 (index 0), RUS actually finished P2 (index 1) → 1 pt.
    const s = scorePositions([99, 10, 11], [88, 99, 77], null, 3);
    expect(s.perPosition[0]).toBe(1);
    expect(s.exactCount).toBe(0);
  });

  it("awards 0 when the driver is off by two or more", () => {
    // Predicted at index 0, actually finished index 2 → off by 2 → 0.
    const s = scorePositions([99], [10, 11, 99], null, 3);
    expect(s.perPosition[0]).toBe(0);
  });

  it("awards 0 when the predicted driver is not in the result/boundary", () => {
    const s = scorePositions([999], [1, 2, 3], null, 3);
    expect(s.perPosition[0]).toBe(0);
  });

  it("treats null predicted slots as 0", () => {
    const s = scorePositions([null, 2, null], [1, 2, 3], null, 3);
    expect(s.perPosition).toEqual([0, 3, 0]);
  });

  it("uses the boundary driver for the +1 case on the last slot (P10 → P11)", () => {
    // 10 exact + a predicted P10 driver who actually finished P11.
    const pred = [1, 2, 3, 4, 5, 6, 7, 8, 9, 999];
    const result = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const s = scorePositions(pred, result, 999, 10);
    expect(s.perPosition[9]).toBe(1); // 999 finished at boundary index 10, predicted at 9 → ±1
    expect(s.exactCount).toBe(9);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   scoreRacePrediction
   ═══════════════════════════════════════════════════════════════════════ */
describe("scoreRacePrediction", () => {
  it("awards maximum 92 points for a perfect prediction", () => {
    const result = scoreRacePrediction(makeRaceInput());
    // 30 (10×3) + 9 (3×3 quali) + 1 (FL) + 1 (FPS) + 1 (DOTD)
    //  + 10 (podium) + 30 (top-10) + 10 (quali bonus) = 92
    expect(result.total).toBe(92);
    expect(result.positionMatches).toBe(10);
    expect(result.positionPoints).toBe(30);
    expect(result.qualifyingPositionMatches).toBe(3);
    expect(result.qualifyingPoints).toBe(9);
    expect(result.poleMatch).toBe(true);
    expect(result.fastestLapMatch).toBe(true);
    expect(result.fastestPitStopMatch).toBe(true);
    expect(result.driverOfTheDayMatch).toBe(true);
    expect(result.perfectPodium).toBe(true);
    expect(result.perfectTopN).toBe(true);
    expect(result.perfectQualifying).toBe(true);
    expect(result.matchPodium).toBe(false);
    expect(result.matchTopN).toBe(false);
    expect(result.matchQualifying).toBe(false);
  });

  it("returns 0 points when nothing matches", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
        predQualifyingTop3: [21, 22, 23],
        predFastestLap: 31,
        predFastestPitStop: 32,
        predDriverOfTheDay: 33,
      })
    );
    expect(result.total).toBe(0);
    expect(result.positionMatches).toBe(0);
    expect(result.qualifyingPoints).toBe(0);
    expect(result.poleMatch).toBe(false);
  });

  it("awards 3 for exact and 1 for ±1 proximity within the top-10", () => {
    // HAM(=44) predicted P3 (index 2), finishes P2 (index 1) → 1 pt.
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [1, 99, 44, 98, 97, 96, 95, 94, 93, 92],
        resultTop10: [1, 44, 3, 4, 5, 6, 7, 8, 9, 10],
        predQualifyingTop3: [50, 51, 52], // none match
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    // P1 (driver 1) exact = 3; P3 predicted 44 finished P2 → 1; rest miss.
    expect(result.positionPoints).toBe(4);
    expect(result.positionMatches).toBe(1);
  });

  it("awards proximity at the P10→P11 boundary", () => {
    // ALO (=14) predicted P10 (index 9), finished P11 (boundary) → 1 pt.
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [50, 51, 52, 53, 54, 55, 56, 57, 58, 14],
        resultTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        resultP11: 14,
        predQualifyingTop3: [60, 61, 62],
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    expect(result.positionPoints).toBe(1);
    expect(result.positionMatches).toBe(0);
  });

  it("scores qualifying 3/1/0 with proximity at the Q3→Q4 boundary", () => {
    // Q1 exact (3), Q2 off by one (1), Q3 predicted finished Q4 (1).
    const result = scoreRacePrediction(
      makeRaceInput({
        predQualifyingTop3: [1, 3, 99],
        resultQualifyingTop3: [1, 2, 3],
        resultQualifyingP4: 99,
        predTop10: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    // Q1=1 exact(3); Q2 predicted 3 finished Q3 (index 2 vs 1 → ±1 → 1);
    // Q3 predicted 99 finished Q4 boundary (index 3 vs 2 → ±1 → 1) = 5
    expect(result.qualifyingPoints).toBe(5);
    expect(result.qualifyingPositionMatches).toBe(1);
    expect(result.poleMatch).toBe(true);
  });

  it("awards qualifying perfect bonus (+10) when Q1-Q3 in exact order", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    // quali 9 (3×3) + perfectQualifying 10 = 19
    expect(result.perfectQualifying).toBe(true);
    expect(result.matchQualifying).toBe(false);
    expect(result.total).toBe(19);
  });

  it("awards qualifying match bonus (+5) when Q1-Q3 correct but wrong order", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predQualifyingTop3: [3, 1, 2],
        resultQualifyingTop3: [1, 2, 3],
        resultQualifyingP4: 99,
        predTop10: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    expect(result.perfectQualifying).toBe(false);
    expect(result.matchQualifying).toBe(true);
    // per-slot: Q1 pred 3 finished Q3(idx2 vs 0 → off 2 → 0);
    // Q2 pred 1 finished Q1(idx0 vs 1 → ±1 → 1); Q3 pred 2 finished Q2(idx1 vs 2 → ±1 → 1) = 2
    // + matchQualifying 5 = 7
    expect(result.qualifyingPoints).toBe(2);
    expect(result.total).toBe(7);
  });

  it("awards exact podium bonus (+10)", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [1, 2, 3, 24, 25, 26, 27, 28, 29, 30],
        predQualifyingTop3: [60, 61, 62],
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    expect(result.perfectPodium).toBe(true);
    expect(result.matchPodium).toBe(false);
    // 3 exact positions = 9 + perfectPodium 10 = 19
    expect(result.positionPoints).toBe(9);
    expect(result.total).toBe(19);
  });

  it("awards match podium bonus (+5) when top 3 correct but wrong order", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [3, 1, 2, 24, 25, 26, 27, 28, 29, 30],
        resultTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        resultP11: 11,
        predQualifyingTop3: [60, 61, 62],
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(true);
  });

  it("awards exact top-10 bonus (+30)", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predQualifyingTop3: [60, 61, 62],
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    // 30 (positions) + 10 (perfect podium) + 30 (perfect top-10) = 70
    expect(result.perfectTopN).toBe(true);
    expect(result.total).toBe(70);
  });

  it("awards match top-10 bonus (+15) when all present but wrong order", () => {
    // Cyclic shift so all 10 present, none in place, podium drivers not in podium.
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [10, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        resultTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        resultP11: 99,
        predQualifyingTop3: [60, 61, 62],
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    expect(result.perfectTopN).toBe(false);
    expect(result.matchTopN).toBe(true);
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(false);
  });

  it("awards each special exactly 1 point", () => {
    const fl = scoreRacePrediction(
      makeRaceInput({
        predTop10: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
        predQualifyingTop3: [60, 61, 62],
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    expect(fl.fastestLapMatch).toBe(true);
    expect(fl.total).toBe(1);
  });

  it("poleMatch reflects Q1 exact only", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predQualifyingTop3: [99, 2, 3], // Q1 wrong, Q2/Q3 right
      })
    );
    expect(result.poleMatch).toBe(false);
  });

  it("awards +1 proximity to a legacy pole prediction when that driver qualified P2 (real quali uploaded)", () => {
    // Legacy prediction carries only the pole (driver 7) as a length-1 array.
    // After uploading the REAL qualifying top-3, driver 7 actually qualified P2.
    // Predicting pole for a driver who lands one slot away = 1 proximity point.
    const result = scoreRacePrediction(
      makeRaceInput({
        predQualifyingTop3: [7], // legacy: only pole predicted
        resultQualifyingTop3: [1, 7, 2], // real quali — 7 qualified P2
        resultQualifyingP4: 3,
        predTop10: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59], // no other points
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    expect(result.poleMatch).toBe(false); // 7 !== Q1 (driver 1)
    expect(result.qualifyingPositionMatches).toBe(0); // not exact
    expect(result.qualifyingPoints).toBe(1); // ±1 proximity
    expect(result.perfectQualifying).toBe(false);
    expect(result.matchQualifying).toBe(false);
    expect(result.total).toBe(1);
  });

  it("does NOT award the qualifying bonus on a legacy single-pole row (Issue #76 backfill)", () => {
    // Legacy data: prediction & result only carry the old pole as a length-1
    // qualifying_top_3 array. A correct pole must score Q1 = 3 and nothing more —
    // the 10/5 quali top-3 bonus must NOT apply retroactively.
    const result = scoreRacePrediction(
      makeRaceInput({
        predQualifyingTop3: [7], // backfilled [pole]
        resultQualifyingTop3: [7], // backfilled [pole]
        resultQualifyingP4: null,
        predTop10: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59], // no position/podium/topN points
        predFastestLap: 0,
        predFastestPitStop: 0,
        predDriverOfTheDay: 0,
      })
    );
    expect(result.poleMatch).toBe(true);
    expect(result.qualifyingPositionMatches).toBe(1);
    expect(result.qualifyingPoints).toBe(3); // Q1 exact only
    expect(result.perfectQualifying).toBe(false);
    expect(result.matchQualifying).toBe(false);
    expect(result.total).toBe(3);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   scoreSprintPrediction
   ═══════════════════════════════════════════════════════════════════════ */
describe("scoreSprintPrediction", () => {
  it("awards maximum 78 points for a perfect sprint prediction", () => {
    const result = scoreSprintPrediction(makeSprintInput());
    // 24 (8×3) + 9 (3×3 quali) + 1 (FL) + 10 (podium) + 24 (top-8) + 10 (quali) = 78
    expect(result.total).toBe(78);
    expect(result.positionMatches).toBe(8);
    expect(result.positionPoints).toBe(24);
    expect(result.qualifyingPoints).toBe(9);
    expect(result.poleMatch).toBe(true);
    expect(result.fastestLapMatch).toBe(true);
    expect(result.perfectPodium).toBe(true);
    expect(result.perfectTopN).toBe(true);
    expect(result.perfectQualifying).toBe(true);
  });

  it("returns 0 for a completely wrong sprint prediction", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [21, 22, 23, 24, 25, 26, 27, 28],
        predQualifyingTop3: [31, 32, 33],
        predFastestLap: 41,
      })
    );
    expect(result.total).toBe(0);
    expect(result.positionMatches).toBe(0);
  });

  it("awards proximity at the P8→P9 boundary", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [50, 51, 52, 53, 54, 55, 56, 14],
        resultTop8: [1, 2, 3, 4, 5, 6, 7, 8],
        resultP9: 14,
        predQualifyingTop3: [60, 61, 62],
        predFastestLap: 0,
      })
    );
    expect(result.positionPoints).toBe(1);
  });

  it("awards sprint podium exact bonus (+10)", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [1, 2, 3, 24, 25, 26, 27, 28],
        predQualifyingTop3: [60, 61, 62],
        predFastestLap: 0,
      })
    );
    expect(result.perfectPodium).toBe(true);
    // 3 exact positions = 9 + perfectPodium 10 = 19
    expect(result.total).toBe(19);
  });

  it("awards sprint top-8 exact bonus (+24)", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({ predQualifyingTop3: [60, 61, 62], predFastestLap: 0 })
    );
    // 24 (positions) + 10 (podium) + 24 (top-8) = 58
    expect(result.perfectTopN).toBe(true);
    expect(result.total).toBe(58);
  });

  it("awards sprint top-8 match bonus (+12) when all present but wrong order", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [8, 1, 2, 3, 4, 5, 6, 7],
        resultTop8: [1, 2, 3, 4, 5, 6, 7, 8],
        resultP9: 99,
        predQualifyingTop3: [60, 61, 62],
        predFastestLap: 0,
      })
    );
    expect(result.perfectTopN).toBe(false);
    expect(result.matchTopN).toBe(true);
    expect(result.matchPodium).toBe(false);
  });

  it("awards sprint qualifying bonus (+10 perfect / +5 match)", () => {
    const perfect = scoreSprintPrediction(
      makeSprintInput({ predTop8: [50, 51, 52, 53, 54, 55, 56, 57], predFastestLap: 0 })
    );
    expect(perfect.perfectQualifying).toBe(true);
    // 9 (quali positions) + 10 (quali bonus) = 19
    expect(perfect.total).toBe(19);
  });

  it("sprint fastest lap match awards 1 point", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [21, 22, 23, 24, 25, 26, 27, 28],
        predQualifyingTop3: [31, 32, 33],
        predFastestLap: 2,
      })
    );
    expect(result.fastestLapMatch).toBe(true);
    expect(result.total).toBe(1);
  });

  it("does NOT award the qualifying bonus on a legacy single-pole sprint row (Issue #76 backfill)", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predQualifyingTop3: [7], // backfilled [sprint pole]
        resultQualifyingTop3: [7],
        resultQualifyingP4: null,
        predTop8: [50, 51, 52, 53, 54, 55, 56, 57], // no position/podium/topN points
        predFastestLap: 0,
      })
    );
    expect(result.poleMatch).toBe(true);
    expect(result.qualifyingPoints).toBe(3); // Q1 exact only
    expect(result.perfectQualifying).toBe(false);
    expect(result.matchQualifying).toBe(false);
    expect(result.total).toBe(3);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   scoreChampionPrediction (unchanged — 20/10 scale)
   ═══════════════════════════════════════════════════════════════════════ */
describe("scoreChampionPrediction", () => {
  it("awards 70 points when all correct and no half-points", () => {
    const result = scoreChampionPrediction(makeChampionInput());
    expect(result.total).toBe(70);
  });

  it("returns 0 when nothing matches", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({
        predWdc: 99,
        predWcc: 999,
        predMostDnfs: 99,
        predMostPodiums: 99,
        predMostWins: 99,
      })
    );
    expect(result.total).toBe(0);
  });

  it("applies half-points correctly (floor division)", () => {
    const result = scoreChampionPrediction(makeChampionInput({ isHalfPoints: true }));
    expect(result.total).toBe(35);
  });

  it("does not award when result is null", () => {
    const result = scoreChampionPrediction(makeChampionInput({ resultMostDnfs: null }));
    expect(result.mostDnfsMatch).toBe(false);
    expect(result.total).toBe(60);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   computeRaceFieldPoints
   ═══════════════════════════════════════════════════════════════════════ */
describe("computeRaceFieldPoints", () => {
  it("returns per-slot 3s + bonuses on a full match", () => {
    const fp = computeRaceFieldPoints(makeRaceInput());
    expect(fp.qualifyingTop3).toEqual([3, 3, 3]);
    expect(fp.raceWinner).toBe(3);
    expect(fp.restOfTop10).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(fp.fastestLap).toBe(1);
    expect(fp.fastestPitStop).toBe(1);
    expect(fp.driverOfTheDay).toBe(1);
    expect(fp.perfectPodiumBonus).toBe(10);
    expect(fp.matchPodiumBonus).toBe(0);
    expect(fp.perfectTop10Bonus).toBe(30);
    expect(fp.matchTop10Bonus).toBe(0);
    expect(fp.perfectQualifyingBonus).toBe(10);
    expect(fp.matchQualifyingBonus).toBe(0);
    expect(fp.total).toBe(92);
  });

  it("reflects ±1 proximity as a 1 in the per-slot array", () => {
    const fp = computeRaceFieldPoints(
      makeRaceInput({
        predTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 14], // P10 predicted finished P11
        resultTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        resultP11: 14,
      })
    );
    expect(fp.restOfTop10[8]).toBe(1); // P10 slot = ±1 proximity
  });

  it("returns all zeros when nothing matches", () => {
    const fp = computeRaceFieldPoints(
      makeRaceInput({
        predTop10: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
        predQualifyingTop3: [31, 32, 33],
        predFastestLap: 41,
        predFastestPitStop: 42,
        predDriverOfTheDay: 43,
      })
    );
    expect(fp.total).toBe(0);
    expect(fp.raceWinner).toBe(0);
    expect(fp.restOfTop10.every((p) => p === 0)).toBe(true);
    expect(fp.qualifyingTop3.every((p) => p === 0)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   computeSprintFieldPoints
   ═══════════════════════════════════════════════════════════════════════ */
describe("computeSprintFieldPoints", () => {
  it("returns per-slot 3s + bonuses on a full match", () => {
    const fp = computeSprintFieldPoints(makeSprintInput());
    expect(fp.qualifyingTop3).toEqual([3, 3, 3]);
    expect(fp.sprintWinner).toBe(3);
    expect(fp.restOfTop8).toEqual([3, 3, 3, 3, 3, 3, 3]);
    expect(fp.fastestLap).toBe(1);
    expect(fp.perfectPodiumBonus).toBe(10);
    expect(fp.perfectTop8Bonus).toBe(24);
    expect(fp.perfectQualifyingBonus).toBe(10);
    expect(fp.total).toBe(78);
  });

  it("returns all zeros when nothing matches", () => {
    const fp = computeSprintFieldPoints(
      makeSprintInput({
        predTop8: [21, 22, 23, 24, 25, 26, 27, 28],
        predQualifyingTop3: [31, 32, 33],
        predFastestLap: 41,
      })
    );
    expect(fp.total).toBe(0);
    expect(fp.restOfTop8.every((p) => p === 0)).toBe(true);
    expect(fp.sprintWinner).toBe(0);
  });
});
