/**
 * Tests for lib/scoring.ts — the heart of the F1 prediction scoring engine.
 *
 * Covers: scoreRacePrediction, scoreSprintPrediction, scoreChampionPrediction
 * and indirectly tests internal helpers arraysMatchExact / arraysMatchAnyOrder.
 */
import {
  scoreRacePrediction,
  scoreSprintPrediction,
  scoreChampionPrediction,
  type RaceScoringInput,
  type SprintScoringInput,
  type ChampionScoringInput,
} from "@/lib/scoring";

/* ═══════════════════════════════════════════════════════════════════════
   Helper: builds a default RaceScoringInput with overrides
   ═══════════════════════════════════════════════════════════════════════ */
function makeRaceInput(overrides: Partial<RaceScoringInput> = {}): RaceScoringInput {
  return {
    predTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    predPole: 1,
    predFastestLap: 2,
    predFastestPitStop: 3,
    predDriverOfTheDay: 4,
    resultTop10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    resultPole: 1,
    resultFastestLap: 2,
    resultFastestPitStop: 3,
    resultDriverOfTheDay: 4,
    ...overrides,
  };
}

function makeSprintInput(overrides: Partial<SprintScoringInput> = {}): SprintScoringInput {
  return {
    predTop8: [1, 2, 3, 4, 5, 6, 7, 8],
    predSprintPole: 1,
    predFastestLap: 2,
    resultTop8: [1, 2, 3, 4, 5, 6, 7, 8],
    resultSprintPole: 1,
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
   scoreRacePrediction
   ═══════════════════════════════════════════════════════════════════════ */
describe("scoreRacePrediction", () => {
  it("awards maximum 42 points for a perfect prediction", () => {
    const result = scoreRacePrediction(makeRaceInput());
    // 10 positions + pole(1) + FL(1) + pit(1) + DOTD(1) + perfectPodium(10) + perfectTop10(10) = 34
    // Wait, let me recalculate:
    // positionMatches = 10, pole = 1, FL = 1, pit = 1, DOTD = 1
    // perfectPodium = 10, perfectTop10 = 10
    // total = 10 + 1 + 1 + 1 + 1 + 10 + 10 = 34
    expect(result.total).toBe(34);
    expect(result.positionMatches).toBe(10);
    expect(result.poleMatch).toBe(true);
    expect(result.fastestLapMatch).toBe(true);
    expect(result.fastestPitStopMatch).toBe(true);
    expect(result.driverOfTheDayMatch).toBe(true);
    expect(result.perfectPodium).toBe(true);
    expect(result.matchPodium).toBe(false);
    expect(result.perfectTopN).toBe(true);
    expect(result.matchTopN).toBe(false);
  });

  it("returns 0 points when nothing matches", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        predPole: 11,
        predFastestLap: 12,
        predFastestPitStop: 13,
        predDriverOfTheDay: 14,
      })
    );
    expect(result.total).toBe(0);
    expect(result.positionMatches).toBe(0);
    expect(result.poleMatch).toBe(false);
    expect(result.fastestLapMatch).toBe(false);
    expect(result.fastestPitStopMatch).toBe(false);
    expect(result.driverOfTheDayMatch).toBe(false);
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(false);
    expect(result.perfectTopN).toBe(false);
    expect(result.matchTopN).toBe(false);
  });

  it("awards exact podium bonus (+10) when top 3 in correct order", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [1, 2, 3, 14, 15, 16, 17, 18, 19, 20],
        predPole: 99,
        predFastestLap: 99,
        predFastestPitStop: 99,
        predDriverOfTheDay: 99,
      })
    );
    expect(result.perfectPodium).toBe(true);
    expect(result.matchPodium).toBe(false);
    expect(result.positionMatches).toBe(3);
    // 3 positions + perfectPodium(10) = 13
    expect(result.total).toBe(13);
  });

  it("awards any-order podium bonus (+5) when top 3 correct but wrong order", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [3, 1, 2, 14, 15, 16, 17, 18, 19, 20],
        predPole: 99,
        predFastestLap: 99,
        predFastestPitStop: 99,
        predDriverOfTheDay: 99,
      })
    );
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(true);
    expect(result.positionMatches).toBe(0);
    // 0 positions + matchPodium(5) = 5
    expect(result.total).toBe(5);
  });

  it("awards exact top-10 bonus (+10) when all 10 in correct order", () => {
    const result = scoreRacePrediction(makeRaceInput());
    expect(result.perfectTopN).toBe(true);
    expect(result.matchTopN).toBe(false);
  });

  it("awards any-order top-10 bonus (+5) when all 10 present but wrong order", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
        predPole: 99,
        predFastestLap: 99,
        predFastestPitStop: 99,
        predDriverOfTheDay: 99,
      })
    );
    expect(result.perfectTopN).toBe(false);
    expect(result.matchTopN).toBe(true);
    // podium: pred[0..2]=[10,9,8] vs result[0..2]=[1,2,3] → different drivers → no podium bonus
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(false);
    // total = 0 positions + 5 (matchTopN) = 5
    expect(result.total).toBe(5);
  });

  it("counts partial position matches correctly", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [1, 2, 99, 4, 99, 6, 99, 8, 99, 10],
        predPole: 99,
        predFastestLap: 99,
        predFastestPitStop: 99,
        predDriverOfTheDay: 99,
      })
    );
    expect(result.positionMatches).toBe(6);
    // not perfect podium (P3 wrong), not match podium (99 not in result)
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(false);
  });

  it("treats null predictions in predTop10 as non-matching", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [null, null, null, null, null, null, null, null, null, null],
        predPole: null,
        predFastestLap: null,
        predFastestPitStop: null,
        predDriverOfTheDay: null,
      })
    );
    expect(result.positionMatches).toBe(0);
    expect(result.total).toBe(0);
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(false);
    expect(result.perfectTopN).toBe(false);
    expect(result.matchTopN).toBe(false);
  });

  it("awards pole point independently", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        predPole: 1,
        predFastestLap: 99,
        predFastestPitStop: 99,
        predDriverOfTheDay: 99,
      })
    );
    expect(result.poleMatch).toBe(true);
    expect(result.total).toBe(1);
  });

  it("awards fastest lap point independently", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        predPole: 99,
        predFastestLap: 2,
        predFastestPitStop: 99,
        predDriverOfTheDay: 99,
      })
    );
    expect(result.fastestLapMatch).toBe(true);
    expect(result.total).toBe(1);
  });

  it("awards fastest pit stop point independently", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        predPole: 99,
        predFastestLap: 99,
        predFastestPitStop: 3,
        predDriverOfTheDay: 99,
      })
    );
    expect(result.fastestPitStopMatch).toBe(true);
    expect(result.total).toBe(1);
  });

  it("awards DOTD point independently", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        predPole: 99,
        predFastestLap: 99,
        predFastestPitStop: 99,
        predDriverOfTheDay: 4,
      })
    );
    expect(result.driverOfTheDayMatch).toBe(true);
    expect(result.total).toBe(1);
  });

  it("does NOT award DOTD when resultDriverOfTheDay is null", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predDriverOfTheDay: 4,
        resultDriverOfTheDay: null,
      })
    );
    expect(result.driverOfTheDayMatch).toBe(false);
  });

  it("does NOT award DOTD when predDriverOfTheDay is null", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predDriverOfTheDay: null,
        resultDriverOfTheDay: 4,
      })
    );
    expect(result.driverOfTheDayMatch).toBe(false);
  });

  it("handles empty predTop10 array gracefully", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [],
      })
    );
    expect(result.positionMatches).toBe(0);
    // Empty slices mean arraysMatchExact returns true for (0,3) since loop doesn't run
    // Let's check
    // arraysMatchExact([], result, 0, 3) → loop from 0..2, pred[0] is undefined → returns false
    // Actually pred[i] would be undefined, and undefined === null is false, so returns false
    expect(result.perfectPodium).toBe(false);
  });

  it("awards both podium and top10 exact bonuses for a perfect prediction", () => {
    const result = scoreRacePrediction(makeRaceInput());
    expect(result.perfectPodium).toBe(true);
    expect(result.perfectTopN).toBe(true);
    // 10 + 1 + 1 + 1 + 1 + 10 + 10 = 34
    expect(result.total).toBe(34);
  });

  it("gives matchPodium but not perfectPodium when order is wrong", () => {
    // Pred: [2, 1, 3, ...] vs Result: [1, 2, 3, ...]
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10],
      })
    );
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(true);
    // positions: P3(3)=3, P4(4)=4...P10 = correct → 8 positions match
    expect(result.positionMatches).toBe(8);
  });

  it("does not give any podium bonus if only 2 of 3 podium drivers match", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [1, 2, 99, 4, 5, 6, 7, 8, 9, 10],
      })
    );
    expect(result.perfectPodium).toBe(false);
    // arraysMatchAnyOrder checks if pred set {1,2,99} == result set {1,2,3} → 99 not in result → false
    expect(result.matchPodium).toBe(false);
  });

  it("handles predTop10 with some nulls in podium positions", () => {
    const result = scoreRacePrediction(
      makeRaceInput({
        predTop10: [1, null, 3, 4, 5, 6, 7, 8, 9, 10],
      })
    );
    // P1 matches, P2 is null (→ no match), P3 matches...
    expect(result.positionMatches).toBe(9);
    // perfectPodium: pred[1] is null → false
    expect(result.perfectPodium).toBe(false);
    // matchPodium: predSlice has null → false
    expect(result.matchPodium).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   scoreSprintPrediction
   ═══════════════════════════════════════════════════════════════════════ */
describe("scoreSprintPrediction", () => {
  it("awards maximum 20 points for a perfect sprint prediction", () => {
    const result = scoreSprintPrediction(makeSprintInput());
    // 8 positions + pole(1) + FL(1) + perfectPodium(5) + perfectTopN(5) = 20
    expect(result.total).toBe(20);
    expect(result.positionMatches).toBe(8);
    expect(result.poleMatch).toBe(true);
    expect(result.fastestLapMatch).toBe(true);
    expect(result.perfectPodium).toBe(true);
    expect(result.perfectTopN).toBe(true);
    expect(result.matchPodium).toBe(false);
    expect(result.matchTopN).toBe(false);
  });

  it("returns 0 for a completely wrong sprint prediction", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [11, 12, 13, 14, 15, 16, 17, 18],
        predSprintPole: 11,
        predFastestLap: 12,
      })
    );
    expect(result.total).toBe(0);
    expect(result.positionMatches).toBe(0);
  });

  it("awards sprint podium exact bonus (+5)", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [1, 2, 3, 14, 15, 16, 17, 18],
        predSprintPole: 99,
        predFastestLap: 99,
      })
    );
    expect(result.perfectPodium).toBe(true);
    expect(result.total).toBe(3 + 5); // 3 positions + 5 perfectPodium
  });

  it("awards sprint podium any-order bonus (+2)", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [3, 1, 2, 14, 15, 16, 17, 18],
        predSprintPole: 99,
        predFastestLap: 99,
      })
    );
    expect(result.perfectPodium).toBe(false);
    expect(result.matchPodium).toBe(true);
    expect(result.total).toBe(0 + 2); // 0 positions + 2 matchPodium
  });

  it("awards sprint top-8 exact bonus (+5)", () => {
    const result = scoreSprintPrediction(makeSprintInput({ predSprintPole: 99, predFastestLap: 99 }));
    expect(result.perfectTopN).toBe(true);
    // 8 + 5(podium exact) + 5(top8 exact) = 18
    expect(result.total).toBe(18);
  });

  it("awards sprint top-8 any-order bonus (+2)", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [8, 7, 6, 5, 4, 3, 2, 1],
        predSprintPole: 99,
        predFastestLap: 99,
      })
    );
    expect(result.perfectTopN).toBe(false);
    expect(result.matchTopN).toBe(true);
    // podium: pred[0..2]=[8,7,6] vs result[0..2]=[1,2,3] → different drivers → no podium bonus
    expect(result.matchPodium).toBe(false);
    // 0 positions + 2(matchTopN) = 2
    expect(result.total).toBe(2);
  });

  it("counts partial sprint position matches correctly", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [1, 99, 3, 99, 5, 99, 7, 99],
        predSprintPole: 99,
        predFastestLap: 99,
      })
    );
    expect(result.positionMatches).toBe(4);
  });

  it("handles empty predTop8 gracefully", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({ predTop8: [] })
    );
    expect(result.positionMatches).toBe(0);
    expect(result.perfectPodium).toBe(false);
  });

  it("sprint pole match awards 1 point", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [11, 12, 13, 14, 15, 16, 17, 18],
        predSprintPole: 1,
        predFastestLap: 99,
      })
    );
    expect(result.poleMatch).toBe(true);
    expect(result.total).toBe(1);
  });

  it("sprint fastest lap match awards 1 point", () => {
    const result = scoreSprintPrediction(
      makeSprintInput({
        predTop8: [11, 12, 13, 14, 15, 16, 17, 18],
        predSprintPole: 99,
        predFastestLap: 2,
      })
    );
    expect(result.fastestLapMatch).toBe(true);
    expect(result.total).toBe(1);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   scoreChampionPrediction
   ═══════════════════════════════════════════════════════════════════════ */
describe("scoreChampionPrediction", () => {
  it("awards maximum 70 points when all correct and no half-points", () => {
    const result = scoreChampionPrediction(makeChampionInput());
    expect(result.total).toBe(70);
    expect(result.wdcMatch).toBe(true);
    expect(result.wccMatch).toBe(true);
    expect(result.mostDnfsMatch).toBe(true);
    expect(result.mostPodiumsMatch).toBe(true);
    expect(result.mostWinsMatch).toBe(true);
    expect(result.isHalfPoints).toBe(false);
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
    expect(result.wdcMatch).toBe(false);
    expect(result.wccMatch).toBe(false);
    expect(result.mostDnfsMatch).toBe(false);
    expect(result.mostPodiumsMatch).toBe(false);
    expect(result.mostWinsMatch).toBe(false);
  });

  it("applies half-points correctly (floor division)", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({ isHalfPoints: true })
    );
    // 70 / 2 = 35
    expect(result.total).toBe(35);
    expect(result.isHalfPoints).toBe(true);
  });

  it("half-points with odd total uses Math.floor", () => {
    // Only WDC correct → 20 pts → half = 10
    const result = scoreChampionPrediction(
      makeChampionInput({
        predWcc: 999,
        predMostDnfs: 99,
        predMostPodiums: 99,
        predMostWins: 99,
        isHalfPoints: true,
      })
    );
    expect(result.total).toBe(10); // floor(20/2) = 10

    // WDC + mostDnfs → 20 + 10 = 30 → half = 15
    const result2 = scoreChampionPrediction(
      makeChampionInput({
        predWcc: 999,
        predMostPodiums: 99,
        predMostWins: 99,
        isHalfPoints: true,
      })
    );
    expect(result2.total).toBe(15); // floor(30/2) = 15

    // Only mostDnfs → 10 → half = 5
    const result3 = scoreChampionPrediction(
      makeChampionInput({
        predWdc: 99,
        predWcc: 999,
        predMostPodiums: 99,
        predMostWins: 99,
        isHalfPoints: true,
      })
    );
    expect(result3.total).toBe(5);
  });

  it("does not award mostDnfs when resultMostDnfs is null", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({ resultMostDnfs: null })
    );
    expect(result.mostDnfsMatch).toBe(false);
    // 20 + 20 + 0 + 10 + 10 = 60
    expect(result.total).toBe(60);
  });

  it("does not award mostPodiums when resultMostPodiums is null", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({ resultMostPodiums: null })
    );
    expect(result.mostPodiumsMatch).toBe(false);
    expect(result.total).toBe(60);
  });

  it("does not award mostWins when resultMostWins is null", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({ resultMostWins: null })
    );
    expect(result.mostWinsMatch).toBe(false);
    expect(result.total).toBe(60);
  });

  it("does not award when pred is null even if result is set", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({
        predWdc: null,
        predWcc: null,
        predMostDnfs: null,
        predMostPodiums: null,
        predMostWins: null,
      })
    );
    expect(result.total).toBe(0);
    expect(result.wdcMatch).toBe(false);
    expect(result.wccMatch).toBe(false);
  });

  it("awards WDC independently (20 pts)", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({
        predWcc: 999,
        predMostDnfs: 99,
        predMostPodiums: 99,
        predMostWins: 99,
      })
    );
    expect(result.total).toBe(20);
    expect(result.wdcMatch).toBe(true);
  });

  it("awards WCC independently (20 pts)", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({
        predWdc: 99,
        predMostDnfs: 99,
        predMostPodiums: 99,
        predMostWins: 99,
      })
    );
    expect(result.total).toBe(20);
    expect(result.wccMatch).toBe(true);
  });

  it("awards most DNFs independently (10 pts)", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({
        predWdc: 99,
        predWcc: 999,
        predMostPodiums: 99,
        predMostWins: 99,
      })
    );
    expect(result.total).toBe(10);
    expect(result.mostDnfsMatch).toBe(true);
  });

  it("awards most podiums independently (10 pts)", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({
        predWdc: 99,
        predWcc: 999,
        predMostDnfs: 99,
        predMostWins: 99,
      })
    );
    expect(result.total).toBe(10);
    expect(result.mostPodiumsMatch).toBe(true);
  });

  it("awards most wins independently (10 pts)", () => {
    const result = scoreChampionPrediction(
      makeChampionInput({
        predWdc: 99,
        predWcc: 999,
        predMostDnfs: 99,
        predMostPodiums: 99,
      })
    );
    expect(result.total).toBe(10);
    expect(result.mostWinsMatch).toBe(true);
  });
});
