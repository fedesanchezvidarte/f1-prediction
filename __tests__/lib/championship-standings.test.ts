/**
 * Tests for lib/championship-standings.ts
 *
 * Covers: computeDriverAggregates, buildDriverStandings, buildConstructorStandings,
 * projectStatLeader, fetchChampionshipStandings.
 */
import {
  computeDriverAggregates,
  buildDriverStandings,
  buildConstructorStandings,
  projectStatLeader,
  fetchChampionshipStandings,
  RACE_POINTS,
  SPRINT_POINTS,
  type DriverLookup,
  type RaceResultRow,
  type SprintResultRow,
  type TeamLookup,
} from "@/lib/championship-standings";
import type { Driver } from "@/types";
import { createMockSupabase } from "../helpers/mockSupabase";

/* ═══════════════════════════════════════════════════════════════════════
   Test fixtures
   ═══════════════════════════════════════════════════════════════════════ */
function makeDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    driverNumber: 1,
    firstName: "Test",
    lastName: "Driver",
    nameAcronym: "TST",
    teamName: "Test Team",
    teamColor: "FFFFFF",
    teamId: 1,
    ...overrides,
  };
}

function makeLookup(
  entries: Array<{ id: number; driver?: Partial<Driver>; teamId: number | null }>
): DriverLookup {
  const lookup: DriverLookup = {};
  for (const e of entries) {
    lookup[e.id] = {
      driver: makeDriver({ teamId: e.teamId ?? undefined, ...e.driver }),
      teamId: e.teamId,
    };
  }
  return lookup;
}

function makeRaceRow(overrides: Partial<RaceResultRow> = {}): RaceResultRow {
  return {
    top_10: [],
    dnf_driver_ids: null,
    ...overrides,
  };
}

function makeSprintRow(overrides: Partial<SprintResultRow> = {}): SprintResultRow {
  return {
    top_8: [],
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   computeDriverAggregates
   ═══════════════════════════════════════════════════════════════════════ */
describe("computeDriverAggregates", () => {
  it("returns empty map when both inputs are empty", () => {
    const agg = computeDriverAggregates([], []);
    expect(agg.size).toBe(0);
  });

  it("awards official F1 race points to P1..P10", () => {
    const agg = computeDriverAggregates(
      [makeRaceRow({ top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })],
      []
    );
    for (let i = 0; i < RACE_POINTS.length; i++) {
      expect(agg.get(i + 1)!.points).toBe(RACE_POINTS[i]);
    }
  });

  it("counts wins, podiums, and the per-position countback vector from race results", () => {
    const agg = computeDriverAggregates(
      [
        makeRaceRow({ top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }),
        makeRaceRow({ top_10: [1, 3, 2, 4, 5, 6, 7, 8, 9, 10] }),
        makeRaceRow({ top_10: [2, 1, 4, 3, 5, 6, 7, 8, 9, 10] }),
      ],
      []
    );

    // Driver 1: 2 wins (P1, P1), 1 P2 → 3 podiums
    expect(agg.get(1)!.wins).toBe(2);
    expect(agg.get(1)!.podiums).toBe(3);
    expect(agg.get(1)!.raceFinishCounts[0]).toBe(2); // P1
    expect(agg.get(1)!.raceFinishCounts[1]).toBe(1); // P2

    // Driver 2: 1 win, 2 other top-3 finishes
    expect(agg.get(2)!.wins).toBe(1);
    expect(agg.get(2)!.podiums).toBe(3);
    expect(agg.get(2)!.raceFinishCounts[0]).toBe(1);
    expect(agg.get(2)!.raceFinishCounts[1]).toBe(1);
    expect(agg.get(2)!.raceFinishCounts[2]).toBe(1);
  });

  it("awards sprint points but DOES NOT contribute to wins/podiums or countback", () => {
    const agg = computeDriverAggregates(
      [],
      [makeSprintRow({ top_8: [1, 2, 3, 4, 5, 6, 7, 8] })]
    );

    for (let i = 0; i < SPRINT_POINTS.length; i++) {
      const driverAgg = agg.get(i + 1)!;
      expect(driverAgg.points).toBe(SPRINT_POINTS[i]);
      expect(driverAgg.wins).toBe(0);
      expect(driverAgg.podiums).toBe(0);
      expect(driverAgg.raceFinishCounts.every((c) => c === 0)).toBe(true);
    }
  });

  it("merges race and sprint points for the same driver", () => {
    const agg = computeDriverAggregates(
      [makeRaceRow({ top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })],
      [makeSprintRow({ top_8: [1, 2, 3, 4, 5, 6, 7, 8] })]
    );
    // Driver 1: 25 (race P1) + 8 (sprint P1) = 33
    expect(agg.get(1)!.points).toBe(RACE_POINTS[0] + SPRINT_POINTS[0]);
  });

  it("handles short top_10 arrays gracefully (e.g. red-flagged race with <10 classified)", () => {
    const agg = computeDriverAggregates(
      [makeRaceRow({ top_10: [1, 2, 3] })],
      []
    );
    expect(agg.get(1)!.points).toBe(RACE_POINTS[0]);
    expect(agg.get(2)!.points).toBe(RACE_POINTS[1]);
    expect(agg.get(3)!.points).toBe(RACE_POINTS[2]);
    expect(agg.size).toBe(3);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   buildDriverStandings
   ═══════════════════════════════════════════════════════════════════════ */
describe("buildDriverStandings", () => {
  it("returns an empty array for an empty aggregate map", () => {
    const result = buildDriverStandings(new Map(), {});
    expect(result).toEqual([]);
  });

  it("orders drivers by points DESC and assigns ranks 1..N", () => {
    const agg = computeDriverAggregates(
      [makeRaceRow({ top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })],
      []
    );
    const lookup = makeLookup([
      { id: 1, teamId: 100 },
      { id: 2, teamId: 100 },
      { id: 3, teamId: 200 },
    ]);

    const result = buildDriverStandings(agg, lookup);
    expect(result[0].driverId).toBe(1);
    expect(result[0].rank).toBe(1);
    expect(result[1].driverId).toBe(2);
    expect(result[1].rank).toBe(2);
    expect(result[2].driverId).toBe(3);
    expect(result[2].rank).toBe(3);
  });

  it("breaks ties on points using countback (more P1s wins)", () => {
    // Both drivers end on 25 points: A wins a race; B is P2 + sprint P1 (8 pts) + race P9 (2 pts) = ?
    // Simpler synthetic: Driver A has 1 win + 0 sprint = 25 pts. Driver B has 0 wins, 1 P2 (18) + sprint P1 (8) - need 25 total.
    // We just inject aggregates directly to make the case deterministic.
    const agg = new Map<number, ReturnType<typeof computeDriverAggregates> extends Map<number, infer V> ? V : never>();
    agg.set(10, {
      driverId: 10,
      points: 50,
      wins: 1,
      podiums: 1,
      raceFinishCounts: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    agg.set(20, {
      driverId: 20,
      points: 50,
      wins: 0,
      podiums: 2,
      raceFinishCounts: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    });

    const lookup = makeLookup([
      { id: 10, teamId: 1 },
      { id: 20, teamId: 1 },
    ]);

    const result = buildDriverStandings(agg, lookup);
    expect(result[0].driverId).toBe(10); // P1 wins the countback
    expect(result[1].driverId).toBe(20);
  });

  it("breaks countback ties further by ascending driverId for determinism", () => {
    const agg = new Map<number, ReturnType<typeof computeDriverAggregates> extends Map<number, infer V> ? V : never>();
    agg.set(7, { driverId: 7, points: 18, wins: 0, podiums: 1, raceFinishCounts: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0] });
    agg.set(3, { driverId: 3, points: 18, wins: 0, podiums: 1, raceFinishCounts: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0] });

    const lookup = makeLookup([
      { id: 3, teamId: 1 },
      { id: 7, teamId: 1 },
    ]);

    const result = buildDriverStandings(agg, lookup);
    expect(result[0].driverId).toBe(3);
    expect(result[1].driverId).toBe(7);
  });

  it("only includes drivers present in the lookup (ignores aggregates for unknown drivers)", () => {
    const agg = computeDriverAggregates(
      [makeRaceRow({ top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })],
      []
    );
    const lookup = makeLookup([{ id: 1, teamId: 100 }]);

    const result = buildDriverStandings(agg, lookup);
    expect(result).toHaveLength(1);
    expect(result[0].driverId).toBe(1);
  });

  it("includes every driver in the lookup, even those with zero results (full grid)", () => {
    // Only driver 1 scores in the race. Drivers 2 and 3 never appear in any result.
    // All three must still show up in the standings — F1 publishes the full grid.
    const agg = computeDriverAggregates([makeRaceRow({ top_10: [1] })], []);
    const lookup = makeLookup([
      { id: 1, teamId: 100 },
      { id: 2, teamId: 100 },
      { id: 3, teamId: 200 },
    ]);

    const result = buildDriverStandings(agg, lookup);
    expect(result).toHaveLength(3);
    // Driver 1 leads on points; 2 and 3 tied at zero, fall back to driverId ASC.
    expect(result[0].driverId).toBe(1);
    expect(result[0].points).toBe(RACE_POINTS[0]);
    expect(result[1].driverId).toBe(2);
    expect(result[1].points).toBe(0);
    expect(result[1].raceFinishCounts.every((c) => c === 0)).toBe(true);
    expect(result[2].driverId).toBe(3);
    expect(result[2].points).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   buildConstructorStandings
   ═══════════════════════════════════════════════════════════════════════ */
describe("buildConstructorStandings", () => {
  it("returns an empty array when there are no driver standings", () => {
    const result = buildConstructorStandings([], {}, {});
    expect(result).toEqual([]);
  });

  it("sums per-driver points/wins/podiums into team totals", () => {
    const agg = computeDriverAggregates(
      [
        makeRaceRow({ top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }),
        makeRaceRow({ top_10: [2, 1, 4, 3, 5, 6, 7, 8, 9, 10] }),
      ],
      []
    );

    const driverLookup = makeLookup([
      { id: 1, teamId: 100 }, // 25 + 18 = 43 pts, 1 win, 2 podiums
      { id: 2, teamId: 100 }, // 18 + 25 = 43 pts, 1 win, 2 podiums
      { id: 3, teamId: 200 }, // 15 + 12 = 27 pts, 0 wins, 1 podium
      { id: 4, teamId: 200 }, // 12 + 15 = 27 pts, 0 wins, 1 podium
    ]);
    const teamLookup: TeamLookup = {
      100: { name: "Team A", color: "FF0000" },
      200: { name: "Team B", color: "0000FF" },
    };

    const wdc = buildDriverStandings(agg, driverLookup);
    const wcc = buildConstructorStandings(wdc, driverLookup, teamLookup);

    expect(wcc[0].teamId).toBe(100);
    expect(wcc[0].teamName).toBe("Team A");
    expect(wcc[0].points).toBe(43 + 43);
    expect(wcc[0].wins).toBe(2);
    expect(wcc[0].podiums).toBe(4);
    expect(wcc[0].rank).toBe(1);

    expect(wcc[1].teamId).toBe(200);
    expect(wcc[1].points).toBe(27 + 27);
    expect(wcc[1].rank).toBe(2);
  });

  it("skips drivers without a team", () => {
    const agg = computeDriverAggregates(
      [makeRaceRow({ top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] })],
      []
    );
    const driverLookup = makeLookup([
      { id: 1, teamId: null },
      { id: 2, teamId: 100 },
    ]);
    const teamLookup: TeamLookup = { 100: { name: "Team A", color: "FFFFFF" } };

    const wdc = buildDriverStandings(agg, driverLookup);
    const wcc = buildConstructorStandings(wdc, driverLookup, teamLookup);

    expect(wcc).toHaveLength(1);
    expect(wcc[0].teamId).toBe(100);
  });

  it("breaks team ties using F1 countback on summed race finishes", () => {
    // Both teams finish on 25 points. Team 100's driver took P1; Team 200's driver
    // took two P5s (10+10) plus their teammate had a P9 (... wait, 25 != 20 here).
    // Use a synthetic aggregate to keep the case deterministic.
    const agg = new Map<number, ReturnType<typeof computeDriverAggregates> extends Map<number, infer V> ? V : never>();
    // Team 100 driver: 1 win, no other finishes
    agg.set(1, {
      driverId: 1,
      points: 25,
      wins: 1,
      podiums: 1,
      raceFinishCounts: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    // Team 200 driver: P2 + P9 = 18 + 2 = 20... let's use raceFinishCounts that produce 25 pts.
    // Easier: 1 P1 vs 1 P2 + 1 P3 = 25 vs 33. Use synthetic equal points instead.
    agg.set(2, {
      driverId: 2,
      points: 25,
      wins: 0,
      podiums: 2,
      raceFinishCounts: [0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
    });

    const driverLookup = makeLookup([
      { id: 1, teamId: 100 },
      { id: 2, teamId: 200 },
    ]);
    const teamLookup: TeamLookup = {
      100: { name: "A", color: "F" },
      200: { name: "B", color: "F" },
    };

    const wdc = buildDriverStandings(agg, driverLookup);
    const wcc = buildConstructorStandings(wdc, driverLookup, teamLookup);

    // Both teams have 25 points. Team 100 has 1 P1, Team 200 has 0 P1s →
    // Team 100 wins on countback at the very first comparison.
    expect(wcc[0].teamId).toBe(100);
    expect(wcc[0].raceFinishCounts[0]).toBe(1);
    expect(wcc[1].teamId).toBe(200);
    expect(wcc[1].raceFinishCounts[0]).toBe(0);
  });

  it("includes every team in the lookup, even those with no scoring drivers (full grid)", () => {
    // Only team 100 has scoring drivers. Teams 200 and 300 have no points.
    // All three teams must appear in the constructor standings.
    const agg = computeDriverAggregates([makeRaceRow({ top_10: [1] })], []);
    const driverLookup = makeLookup([
      { id: 1, teamId: 100 },
      { id: 2, teamId: 200 },
      { id: 3, teamId: 300 },
    ]);
    const teamLookup: TeamLookup = {
      100: { name: "A", color: "F" },
      200: { name: "B", color: "F" },
      300: { name: "C", color: "F" },
    };

    const wdc = buildDriverStandings(agg, driverLookup);
    const wcc = buildConstructorStandings(wdc, driverLookup, teamLookup);

    expect(wcc).toHaveLength(3);
    expect(wcc[0].teamId).toBe(100);
    expect(wcc[0].points).toBe(RACE_POINTS[0]);
    // Teams 200 and 300 tied at zero → driverId-equivalent fallback is teamId ASC.
    expect(wcc[1].teamId).toBe(200);
    expect(wcc[1].points).toBe(0);
    expect(wcc[1].raceFinishCounts.every((c) => c === 0)).toBe(true);
    expect(wcc[2].teamId).toBe(300);
    expect(wcc[2].points).toBe(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   projectStatLeader
   ═══════════════════════════════════════════════════════════════════════ */
describe("projectStatLeader", () => {
  it("returns null when the leader is null", () => {
    expect(projectStatLeader(null, {})).toBeNull();
  });

  it("returns null when the leader's driver is missing from the lookup", () => {
    expect(projectStatLeader({ driverId: 1, count: 5 }, {})).toBeNull();
  });

  it("returns a populated StatLeader when the lookup contains the driver", () => {
    const lookup = makeLookup([
      { id: 1, driver: { firstName: "Max", lastName: "Verstappen" }, teamId: 100 },
    ]);
    const result = projectStatLeader({ driverId: 1, count: 5 }, lookup);
    expect(result?.driverId).toBe(1);
    expect(result?.count).toBe(5);
    expect(result?.driver.lastName).toBe("Verstappen");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   fetchChampionshipStandings
   ═══════════════════════════════════════════════════════════════════════ */
describe("fetchChampionshipStandings", () => {
  const EMPTY = {
    wdc: [],
    wcc: [],
    stats: { mostWins: null, mostPodiums: null, mostDnfs: null },
  };

  it("returns an empty payload when no current season exists", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    const result = await fetchChampionshipStandings(supabase);
    expect(result).toEqual(EMPTY);
  });

  it("returns an empty payload when the season has no races", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("races", { data: [], error: null });
    mockTable("drivers", { data: [], error: null });
    mockTable("teams", { data: [], error: null });

    const result = await fetchChampionshipStandings(supabase);
    expect(result).toEqual(EMPTY);
  });

  it("computes standings and stats from race + sprint results", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("races", { data: [{ id: 10 }, { id: 20 }], error: null });
    mockTable("drivers", {
      data: [
        {
          id: 1,
          driver_number: 1,
          first_name: "Max",
          last_name: "Verstappen",
          name_acronym: "VER",
          headshot_url: null,
          team_id: 100,
          teams: { name: "Red Bull", color: "1E5BC6" },
        },
        {
          id: 2,
          driver_number: 44,
          first_name: "Lewis",
          last_name: "Hamilton",
          name_acronym: "HAM",
          headshot_url: null,
          team_id: 200,
          teams: { name: "Ferrari", color: "DC0000" },
        },
        {
          id: 3,
          driver_number: 16,
          first_name: "Charles",
          last_name: "Leclerc",
          name_acronym: "LEC",
          headshot_url: null,
          team_id: 200,
          teams: { name: "Ferrari", color: "DC0000" },
        },
      ],
      error: null,
    });
    mockTable("teams", {
      data: [
        { id: 100, name: "Red Bull", color: "1E5BC6" },
        { id: 200, name: "Ferrari", color: "DC0000" },
      ],
      error: null,
    });
    mockTable("race_results", {
      data: [
        { top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [11] },
        { top_10: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [11] },
      ],
      error: null,
    });
    mockTable("sprint_results", {
      data: [{ top_8: [1, 2, 3, 4, 5, 6, 7, 8] }],
      error: null,
    });

    const result = await fetchChampionshipStandings(supabase);

    // Driver 1: 25 (P1) + 18 (P2) + 8 (sprint P1) = 51
    // Driver 2: 18 (P2) + 25 (P1) + 7 (sprint P2) = 50
    // Driver 3: 15 + 15 + 6 (sprint P3) = 36
    expect(result.wdc[0].driverId).toBe(1);
    expect(result.wdc[0].points).toBe(51);
    expect(result.wdc[0].rank).toBe(1);
    expect(result.wdc[1].driverId).toBe(2);
    expect(result.wdc[1].points).toBe(50);
    expect(result.wdc[2].driverId).toBe(3);
    expect(result.wdc[2].points).toBe(36);

    // Constructors: Ferrari (2+3) = 50+36 = 86, Red Bull (1) = 51
    expect(result.wcc[0].teamId).toBe(200);
    expect(result.wcc[0].points).toBe(86);
    expect(result.wcc[1].teamId).toBe(100);
    expect(result.wcc[1].points).toBe(51);

    // Stats: drivers 1 and 2 tied on wins (1 each), tiebreak goes to lower ID = 1
    expect(result.stats.mostWins?.driverId).toBe(1);
    expect(result.stats.mostWins?.count).toBe(1);
    expect(result.stats.mostPodiums?.driverId).toBe(1);
    // DNF driver 11 is not in the lookup → null
    expect(result.stats.mostDnfs).toBeNull();
  });
});
