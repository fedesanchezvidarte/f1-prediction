/**
 * Tests for packages/shared/lib/prediction-status.ts — pure function, no mocks.
 */
import {
  computeRaceMatchStatuses,
  computeSprintMatchStatuses,
  proximityStatus,
} from "@f1/shared/lib/prediction-status";
import type {
  Driver,
  FullRacePrediction,
  RaceResult,
  SprintPrediction,
  SprintResult,
} from "@f1/shared/types";

function makeDriver(driverNumber: number, acronym = `D${driverNumber}`): Driver {
  return {
    driverNumber,
    firstName: `First${driverNumber}`,
    lastName: `Last${driverNumber}`,
    nameAcronym: acronym,
    teamName: "Team",
    teamColor: "FF0000",
  };
}

// Ordered result: P1=#1, P2=#2, ... P10=#10
const top10 = Array.from({ length: 10 }, (_, i) => makeDriver(i + 1));
const p11 = makeDriver(11);

describe("proximityStatus", () => {
  it("returns null when no driver is predicted for the slot", () => {
    expect(proximityStatus(null, top10, p11, 10, 0)).toBeNull();
  });

  it("returns 'exact' when the predicted driver finished in the exact slot position", () => {
    expect(proximityStatus(makeDriver(1), top10, p11, 10, 0)).toBe("exact");
    expect(proximityStatus(makeDriver(5), top10, p11, 10, 4)).toBe("exact");
    expect(proximityStatus(makeDriver(10), top10, p11, 10, 9)).toBe("exact");
  });

  it("returns 'close' when the predicted driver finished one position ahead", () => {
    // Predicted P5 (slot 4) but finished P4 (index 3)
    expect(proximityStatus(makeDriver(4), top10, p11, 10, 4)).toBe("close");
  });

  it("returns 'close' when the predicted driver finished one position behind", () => {
    // Predicted P5 (slot 4) but finished P6 (index 5)
    expect(proximityStatus(makeDriver(6), top10, p11, 10, 4)).toBe("close");
  });

  it("returns 'miss' when the predicted driver finished two or more positions away", () => {
    // Predicted P1 (slot 0) but finished P3 (index 2)
    expect(proximityStatus(makeDriver(3), top10, p11, 10, 0)).toBe("miss");
    // Predicted P10 (slot 9) but finished P1 (index 0)
    expect(proximityStatus(makeDriver(1), top10, p11, 10, 9)).toBe("miss");
  });

  it("returns 'miss' when the predicted driver is not in the results at all", () => {
    expect(proximityStatus(makeDriver(99), top10, p11, 10, 3)).toBe("miss");
  });

  it("returns 'close' for the last slot when the boundary driver is predicted there", () => {
    // Boundary driver sits at index `count` (P11) — predicted at slot 9 (P10) → delta 1
    expect(proximityStatus(p11, top10, p11, 10, 9)).toBe("close");
  });

  it("returns 'miss' when the boundary driver is predicted two slots from the boundary", () => {
    // Boundary at index 10; predicted at slot 8 (P9) → delta 2
    expect(proximityStatus(p11, top10, p11, 10, 8)).toBe("miss");
  });

  it("works without a boundary driver", () => {
    expect(proximityStatus(makeDriver(11), top10, null, 10, 9)).toBe("miss");
    expect(proximityStatus(makeDriver(3), top10, null, 10, 2)).toBe("exact");
  });

  it("respects the count parameter for shorter result sets (qualifying top 3)", () => {
    const quali = [makeDriver(1), makeDriver(2), makeDriver(3)];
    const q4 = makeDriver(4);
    expect(proximityStatus(makeDriver(3), quali, q4, 3, 2)).toBe("exact");
    expect(proximityStatus(q4, quali, q4, 3, 2)).toBe("close");
    // Driver #5 outside quali results entirely
    expect(proximityStatus(makeDriver(5), quali, q4, 3, 2)).toBe("miss");
  });

  it("keeps the first position when duplicate driver numbers appear in results", () => {
    const withDuplicate = [
      makeDriver(1),
      makeDriver(2),
      makeDriver(1), // duplicate of P1's driver number at index 2
      makeDriver(4),
    ];
    // First occurrence (index 0) wins: slot 0 → exact, slot 2 → miss
    expect(proximityStatus(makeDriver(1), withDuplicate, null, 4, 0)).toBe("exact");
    expect(proximityStatus(makeDriver(1), withDuplicate, null, 4, 2)).toBe("miss");
  });

  it("does not let the boundary driver override an existing result position", () => {
    // Boundary duplicates the P1 driver — the map keeps index 0
    expect(proximityStatus(makeDriver(1), top10, makeDriver(1), 10, 0)).toBe("exact");
  });

  it("skips undefined result slots without crashing", () => {
    const sparse = [makeDriver(1), undefined as unknown as Driver, makeDriver(3)];
    expect(proximityStatus(makeDriver(3), sparse, null, 3, 2)).toBe("exact");
    expect(proximityStatus(makeDriver(2), sparse, null, 3, 1)).toBe("miss");
  });
});

/* ── computeRaceMatchStatuses / computeSprintMatchStatuses ─────────────── */

const RACE_RESULT: RaceResult = {
  raceId: 9001,
  qualifyingTop3: [makeDriver(1), makeDriver(2), makeDriver(3)],
  qualifyingP4: makeDriver(4),
  raceWinner: top10[0],
  top10,
  p11,
  fastestLap: makeDriver(5),
  fastestPitStop: makeDriver(6),
  driverOfTheDay: makeDriver(7),
};

function makeRacePrediction(overrides: Partial<FullRacePrediction> = {}): FullRacePrediction {
  return {
    raceId: 9001,
    userId: "user-123",
    status: "scored",
    qualifyingTop3: [null, null, null],
    raceWinner: null,
    restOfTop10: Array(9).fill(null),
    fastestLap: null,
    fastestPitStop: null,
    driverOfTheDay: null,
    pointsEarned: null,
    ...overrides,
  };
}

describe("computeRaceMatchStatuses", () => {
  it("returns all-null statuses for an empty prediction", () => {
    const statuses = computeRaceMatchStatuses(makeRacePrediction(), RACE_RESULT);
    expect(statuses.qualifyingTop3).toEqual([null, null, null]);
    expect(statuses.raceWinner).toBeNull();
    expect(statuses.restOfTop10).toEqual(Array(9).fill(null));
    expect(statuses.fastestLap).toBeNull();
    expect(statuses.fastestPitStop).toBeNull();
    expect(statuses.driverOfTheDay).toBeNull();
  });

  it("applies ±1 proximity to the top 10 with the P11 boundary", () => {
    const prediction = makeRacePrediction({
      raceWinner: makeDriver(1), // exact P1
      restOfTop10: [
        makeDriver(3), // P2 slot, finished P3 → close
        makeDriver(9), // P3 slot, finished P9 → miss
        ...Array(5).fill(null),
        makeDriver(99), // P9 slot, not in results → miss
        p11, // P10 slot, boundary P11 → close
      ],
    });
    const statuses = computeRaceMatchStatuses(prediction, RACE_RESULT);
    expect(statuses.raceWinner).toBe("exact");
    expect(statuses.restOfTop10[0]).toBe("close");
    expect(statuses.restOfTop10[1]).toBe("miss");
    expect(statuses.restOfTop10[7]).toBe("miss");
    expect(statuses.restOfTop10[8]).toBe("close");
  });

  it("applies ±1 proximity to qualifying with the Q4 boundary", () => {
    const prediction = makeRacePrediction({
      qualifyingTop3: [makeDriver(1), makeDriver(3), makeDriver(4)],
    });
    const statuses = computeRaceMatchStatuses(prediction, RACE_RESULT);
    expect(statuses.qualifyingTop3).toEqual(["exact", "close", "close"]);
  });

  it("uses exact-only matching for the special fields", () => {
    const prediction = makeRacePrediction({
      fastestLap: makeDriver(5), // matches
      fastestPitStop: makeDriver(5), // does not match #6
      driverOfTheDay: makeDriver(7), // matches
    });
    const statuses = computeRaceMatchStatuses(prediction, RACE_RESULT);
    expect(statuses.fastestLap).toBe("exact");
    expect(statuses.fastestPitStop).toBeNull();
    expect(statuses.driverOfTheDay).toBe("exact");
  });

  it("returns null for optional special fields missing from the result", () => {
    const result: RaceResult = {
      ...RACE_RESULT,
      fastestPitStop: undefined,
      driverOfTheDay: undefined,
    };
    const prediction = makeRacePrediction({
      fastestPitStop: makeDriver(6),
      driverOfTheDay: makeDriver(7),
    });
    const statuses = computeRaceMatchStatuses(prediction, result);
    expect(statuses.fastestPitStop).toBeNull();
    expect(statuses.driverOfTheDay).toBeNull();
  });
});

const top8 = Array.from({ length: 8 }, (_, i) => makeDriver(i + 1));
const p9 = makeDriver(9);

const SPRINT_RESULT: SprintResult = {
  raceId: 9002,
  qualifyingTop3: [makeDriver(1), makeDriver(2), makeDriver(3)],
  qualifyingP4: makeDriver(4),
  sprintWinner: top8[0],
  top8,
  p9,
  fastestLap: makeDriver(2),
};

function makeSprintPrediction(overrides: Partial<SprintPrediction> = {}): SprintPrediction {
  return {
    raceId: 9002,
    userId: "user-123",
    status: "scored",
    qualifyingTop3: [null, null, null],
    sprintWinner: null,
    restOfTop8: Array(7).fill(null),
    fastestLap: null,
    pointsEarned: null,
    ...overrides,
  };
}

describe("computeSprintMatchStatuses", () => {
  it("returns all-null statuses for an empty prediction", () => {
    const statuses = computeSprintMatchStatuses(makeSprintPrediction(), SPRINT_RESULT);
    expect(statuses.qualifyingTop3).toEqual([null, null, null]);
    expect(statuses.sprintWinner).toBeNull();
    expect(statuses.restOfTop8).toEqual(Array(7).fill(null));
    expect(statuses.fastestLap).toBeNull();
  });

  it("applies ±1 proximity to the top 8 with the P9 boundary", () => {
    const prediction = makeSprintPrediction({
      sprintWinner: makeDriver(2), // finished P2 → close
      restOfTop8: [
        makeDriver(2), // P2 slot → exact
        ...Array(5).fill(null),
        p9, // P8 slot, boundary P9 → close
      ],
    });
    const statuses = computeSprintMatchStatuses(prediction, SPRINT_RESULT);
    expect(statuses.sprintWinner).toBe("close");
    expect(statuses.restOfTop8[0]).toBe("exact");
    expect(statuses.restOfTop8[6]).toBe("close");
  });

  it("applies ±1 proximity to sprint qualifying and exact-only to the fastest lap", () => {
    const prediction = makeSprintPrediction({
      qualifyingTop3: [makeDriver(2), makeDriver(2), makeDriver(99)],
      fastestLap: makeDriver(2),
    });
    const statuses = computeSprintMatchStatuses(prediction, SPRINT_RESULT);
    expect(statuses.qualifyingTop3).toEqual(["close", "exact", "miss"]);
    expect(statuses.fastestLap).toBe("exact");
  });
});
