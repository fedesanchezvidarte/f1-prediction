/**
 * Tests for packages/shared/lib/results.ts — fetchRaceResults,
 * fetchSprintResults and buildResultQualifyingTop3, with mocked Supabase.
 *
 * Query order without a passed context (matters for the mock queues):
 *   1. seasons (is_current)              — also re-queried inside fetchDrivers (sticky)
 *   2. drivers (id, driver_number map)   — first "drivers" queue entry
 *   3. races   (id, meeting_key map)
 *   4. drivers (full rows, fetchDrivers) — second "drivers" queue entry
 *   5. race_results / sprint_results
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import {
  buildResultQualifyingTop3,
  fetchRaceResults,
  fetchSprintResults,
} from "@f1/shared/lib/results";
import type { Driver } from "@f1/shared/types";

const SEASON_ID = 7;

/** DB driver id = 100 + driver number; 12 drivers, numbers 1..12. */
const DRIVER_ID_ROWS = Array.from({ length: 12 }, (_, i) => ({
  id: 101 + i,
  driver_number: i + 1,
}));

const FULL_DRIVER_ROWS = Array.from({ length: 12 }, (_, i) => ({
  driver_number: i + 1,
  first_name: `First${i + 1}`,
  last_name: `Last${i + 1}`,
  name_acronym: `D${i + 1}`,
  headshot_url: null,
  team_id: 1,
  teams: { name: "Team", color: "FF0000" },
}));

const DB_RACES = [
  { id: 501, meeting_key: 9001 },
  { id: 502, meeting_key: 9002 },
];

function setupBase() {
  const { supabase, mockTable } = createMockSupabase();
  mockTable("seasons", { data: { id: SEASON_ID }, error: null });
  mockTable(
    "drivers",
    { data: DRIVER_ID_ROWS, error: null },
    { data: FULL_DRIVER_ROWS, error: null }
  );
  mockTable("races", { data: DB_RACES, error: null });
  return { supabase, mockTable };
}

describe("buildResultQualifyingTop3", () => {
  const driver = (n: number): Driver => ({
    driverNumber: n,
    firstName: `First${n}`,
    lastName: `Last${n}`,
    nameAcronym: `D${n}`,
    teamName: "Team",
    teamColor: "FF0000",
  });
  const findDriver = (id: number | null) =>
    id !== null && id >= 101 && id <= 112 ? driver(id - 100) : null;

  it("maps the stored array and drops unresolved ids", () => {
    const result = buildResultQualifyingTop3([103, 9999, 101], null, findDriver);
    expect(result.map((d) => d.driverNumber)).toEqual([3, 1]);
  });

  it("falls back to the legacy pole id when the array is empty", () => {
    const result = buildResultQualifyingTop3([], 105, findDriver);
    expect(result.map((d) => d.driverNumber)).toEqual([5]);
  });

  it("returns [] when both sources are empty", () => {
    expect(buildResultQualifyingTop3(null, null, findDriver)).toEqual([]);
  });
});

describe("fetchRaceResults", () => {
  const COMPLETE_ROW = {
    race_id: 501,
    pole_position_driver_id: null,
    qualifying_top_3: [102, 101, 103],
    qualifying_p4_driver_id: 104,
    top_10: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
    p11_driver_id: 111,
    fastest_lap_driver_id: 105,
    fastest_pit_stop_driver_id: 106,
    driver_of_the_day_driver_id: 107,
  };

  it("returns an empty record when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    expect(await fetchRaceResults(supabase)).toEqual({});
  });

  it("maps a complete result row keyed by meeting key", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_results", { data: [COMPLETE_ROW], error: null });

    const results = await fetchRaceResults(supabase);
    const result = results[9001];

    expect(result).toBeDefined();
    expect(result.raceId).toBe(9001);
    expect(result.raceWinner.driverNumber).toBe(1);
    expect(result.top10.map((d) => d.driverNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.qualifyingTop3.map((d) => d.driverNumber)).toEqual([2, 1, 3]);
    expect(result.qualifyingP4?.driverNumber).toBe(4);
    expect(result.p11?.driverNumber).toBe(11);
    expect(result.fastestLap.driverNumber).toBe(5);
    expect(result.fastestPitStop?.driverNumber).toBe(6);
    expect(result.driverOfTheDay?.driverNumber).toBe(7);
  });

  it("omits optional fields that are not stored", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_results", {
      data: [
        {
          ...COMPLETE_ROW,
          qualifying_p4_driver_id: null,
          p11_driver_id: null,
          fastest_pit_stop_driver_id: null,
          driver_of_the_day_driver_id: null,
        },
      ],
      error: null,
    });

    const result = (await fetchRaceResults(supabase))[9001];
    expect(result.qualifyingP4).toBeUndefined();
    expect(result.p11).toBeUndefined();
    expect(result.fastestPitStop).toBeUndefined();
    expect(result.driverOfTheDay).toBeUndefined();
  });

  it("skips incomplete rows (no fastest lap) and rows for unknown race ids", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_results", {
      data: [
        { ...COMPLETE_ROW, fastest_lap_driver_id: null },
        { ...COMPLETE_ROW, race_id: 999 },
      ],
      error: null,
    });

    expect(await fetchRaceResults(supabase)).toEqual({});
  });

  it("falls back to the legacy pole column for the qualifying result", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_results", {
      data: [{ ...COMPLETE_ROW, qualifying_top_3: null, pole_position_driver_id: 108 }],
      error: null,
    });

    const result = (await fetchRaceResults(supabase))[9001];
    expect(result.qualifyingTop3.map((d) => d.driverNumber)).toEqual([8]);
  });
});

describe("fetchSprintResults", () => {
  const COMPLETE_ROW = {
    race_id: 502,
    sprint_pole_driver_id: null,
    qualifying_top_3: [101, 102, 103],
    qualifying_p4_driver_id: 104,
    top_8: [102, 101, 103, 104, 105, 106, 107, 108],
    p9_driver_id: 109,
    fastest_lap_driver_id: 110,
  };

  it("returns an empty record when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    expect(await fetchSprintResults(supabase)).toEqual({});
  });

  it("maps a complete sprint result row keyed by meeting key", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("sprint_results", { data: [COMPLETE_ROW], error: null });

    const result = (await fetchSprintResults(supabase))[9002];

    expect(result).toBeDefined();
    expect(result.sprintWinner.driverNumber).toBe(2);
    expect(result.top8.map((d) => d.driverNumber)).toEqual([2, 1, 3, 4, 5, 6, 7, 8]);
    expect(result.qualifyingTop3.map((d) => d.driverNumber)).toEqual([1, 2, 3]);
    expect(result.qualifyingP4?.driverNumber).toBe(4);
    expect(result.p9?.driverNumber).toBe(9);
    expect(result.fastestLap.driverNumber).toBe(10);
  });

  it("skips rows without a Q1 driver", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("sprint_results", {
      data: [{ ...COMPLETE_ROW, qualifying_top_3: null, sprint_pole_driver_id: null }],
      error: null,
    });

    expect(await fetchSprintResults(supabase)).toEqual({});
  });
});

/* ── fetchRaceResults: deactivated-driver regression ────────────────────── */

/**
 * Regression guard for the per-race lineup feature.
 *
 * `fetchRaceResults` maps `top_10` through `findDriver` and then drops the
 * nulls (`.filter(d => d !== null)`). If `findDriver` cannot resolve a driver
 * who was deactivated after the race, that position is silently removed and
 * every position below it shifts up a place — P6 would be reported as P5.
 * `findDriver` resolves against the full roster, so the array must stay
 * full-length and correctly ordered.
 */
describe("fetchRaceResults with a deactivated driver", () => {
  const COMPLETE_ROW = {
    race_id: 501,
    pole_position_driver_id: null,
    qualifying_top_3: [102, 101, 103],
    qualifying_p4_driver_id: 104,
    top_10: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
    p11_driver_id: 111,
    fastest_lap_driver_id: 105,
    fastest_pit_stop_driver_id: 106,
    driver_of_the_day_driver_id: 107,
  };

  /** id 105 / #5 finished P5 and was deactivated later in the season. */
  const ID_ROWS_WITH_INACTIVE = Array.from({ length: 12 }, (_, i) => ({
    id: 101 + i,
    driver_number: i + 1,
    is_active: 101 + i !== 105,
  }));

  function setupWithInactiveDriver() {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable(
      "drivers",
      { data: ID_ROWS_WITH_INACTIVE, error: null },
      { data: FULL_DRIVER_ROWS, error: null }
    );
    mockTable("races", { data: DB_RACES, error: null });
    mockTable("race_results", { data: [COMPLETE_ROW], error: null });
    return supabase;
  }

  it("keeps top_10 full-length and in order when one finisher is now inactive", async () => {
    const result = (await fetchRaceResults(setupWithInactiveDriver()))[9001];

    expect(result).toBeDefined();
    expect(result.top10).toHaveLength(10);
    expect(result.top10.map((d) => d.driverNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("does not shift the positions below the inactive driver up a place", async () => {
    const result = (await fetchRaceResults(setupWithInactiveDriver()))[9001];

    // P5 is the deactivated driver; P6 must still be #6, not #6-shifted-to-P5.
    expect(result.top10[4].driverNumber).toBe(5);
    expect(result.top10[5].driverNumber).toBe(6);
  });

  it("still resolves the deactivated driver in the single-driver result slots", async () => {
    const result = (await fetchRaceResults(setupWithInactiveDriver()))[9001];

    expect(result.fastestLap.driverNumber).toBe(5);
  });
});
