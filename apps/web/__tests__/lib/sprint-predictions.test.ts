/**
 * Tests for fetchUserSprintPredictions and createPredictionContext
 * (packages/shared/lib/predictions.ts) — service layer with mocked Supabase.
 *
 * Query order inside fetchUserSprintPredictions (matters for the mock queues):
 *   1. seasons (is_current)              — also re-queried inside fetchDrivers (sticky)
 *   2. drivers (id, driver_number map)   — first "drivers" queue entry
 *   3. races   (id, meeting_key map)
 *   4. drivers (full rows, fetchDrivers) — second "drivers" queue entry
 *   5. sprint_predictions (user rows)
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import {
  createPredictionContext,
  fetchUserSprintPredictions,
} from "@f1/shared/lib/predictions";
import type { Race } from "@f1/shared/types";

const USER_ID = "user-123";
const SEASON_ID = 7;

function makeRace(meetingKey: number, round: number, hasSprint = true): Race {
  return {
    meetingKey,
    raceName: `Race ${round}`,
    officialName: `Official Race ${round}`,
    circuitShortName: `Circuit ${round}`,
    countryName: "Country",
    countryCode: "CC",
    location: "Location",
    dateStart: "2026-03-01T00:00:00Z",
    dateEnd: "2026-03-03T00:00:00Z",
    sprintDateEnd: hasSprint ? "2026-03-02T00:00:00Z" : null,
    round,
    hasSprint,
  };
}

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

/** Standard fixture: current season, 12 drivers, 2 races. */
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

describe("createPredictionContext", () => {
  it("returns null when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    expect(await createPredictionContext(supabase)).toBeNull();
  });

  it("builds the race mapping, driver list and driver resolver", async () => {
    const { supabase } = setupBase();
    const ctx = await createPredictionContext(supabase);

    expect(ctx).not.toBeNull();
    expect(ctx!.seasonId).toBe(SEASON_ID);
    expect(ctx!.raceIdToMeetingKey.get(501)).toBe(9001);
    expect(ctx!.raceIdToMeetingKey.get(502)).toBe(9002);
    expect(ctx!.allDrivers).toHaveLength(12);
    expect(ctx!.findDriver(103)?.driverNumber).toBe(3);
    expect(ctx!.findDriver(9999)).toBeNull();
    expect(ctx!.findDriver(null)).toBeNull();
  });
});

describe("fetchUserSprintPredictions", () => {
  it("returns an empty array when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    const result = await fetchUserSprintPredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(result).toEqual([]);
  });

  it("only returns entries for races that have a sprint", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("sprint_predictions", { data: null, error: null });

    const races = [makeRace(9001, 1, true), makeRace(9002, 2, false)];
    const result = await fetchUserSprintPredictions(supabase, USER_ID, races);

    expect(result).toHaveLength(1);
    expect(result[0].raceId).toBe(9001);
  });

  it("returns a pending placeholder with all-null slots when the user has no rows", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("sprint_predictions", { data: null, error: null });

    const [prediction] = await fetchUserSprintPredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction).toEqual({
      raceId: 9001,
      userId: USER_ID,
      status: "pending",
      qualifyingTop3: [null, null, null],
      sprintWinner: null,
      restOfTop8: Array(7).fill(null),
      fastestLap: null,
      pointsEarned: null,
    });
  });

  it("maps a full stored prediction: winner from top_8[0], rest from indexes 1..7, quali, fastest lap, points", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("sprint_predictions", {
      data: [
        {
          race_id: 501,
          status: "scored",
          sprint_pole_driver_id: 103, // ignored when qualifying_top_3 is set
          qualifying_top_3: [103, 101, 102],
          top_8: [101, 102, 103, 104, 105, 106, 107, 108],
          fastest_lap_driver_id: 104,
          points_earned: 21,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserSprintPredictions(supabase, USER_ID, [makeRace(9001, 1)]);

    expect(prediction.status).toBe("scored");
    expect(prediction.pointsEarned).toBe(21);
    expect(prediction.sprintWinner?.driverNumber).toBe(1);
    expect(prediction.restOfTop8).toHaveLength(7);
    expect(prediction.restOfTop8.map((d) => d?.driverNumber)).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(prediction.qualifyingTop3.map((d) => d?.driverNumber ?? null)).toEqual([3, 1, 2]);
    expect(prediction.fastestLap?.driverNumber).toBe(4);
  });

  it("falls back to the legacy sprint_pole_driver_id as Q1 when qualifying_top_3 is empty", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("sprint_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          sprint_pole_driver_id: 107,
          qualifying_top_3: [],
          top_8: [101],
          fastest_lap_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserSprintPredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.qualifyingTop3.map((d) => d?.driverNumber ?? null)).toEqual([7, null, null]);
  });

  it("pads a short top_8 with nulls and ignores rows for unknown race ids", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("sprint_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          sprint_pole_driver_id: null,
          qualifying_top_3: [101, 102, 103],
          top_8: [101, 102],
          fastest_lap_driver_id: null,
          points_earned: null,
        },
        {
          race_id: 999, // not in the season's races
          status: "scored",
          sprint_pole_driver_id: 101,
          qualifying_top_3: [101],
          top_8: [101],
          fastest_lap_driver_id: 101,
          points_earned: 50,
        },
      ],
      error: null,
    });

    const races = [makeRace(9001, 1), makeRace(9002, 2)];
    const [first, second] = await fetchUserSprintPredictions(supabase, USER_ID, races);

    expect(first.sprintWinner?.driverNumber).toBe(1);
    expect(first.restOfTop8.map((d) => d?.driverNumber ?? null)).toEqual([
      2, null, null, null, null, null, null,
    ]);
    expect(second.status).toBe("pending");
    expect(second.pointsEarned).toBeNull();
  });

  it("reuses a passed-in context without re-querying the season mappings", async () => {
    const { supabase, mockTable } = setupBase();
    const ctx = await createPredictionContext(supabase);
    // From here on, only sprint_predictions should be consumed.
    mockTable("sprint_predictions", { data: null, error: null });
    // Poison the mapping queues: if the context were rebuilt, drivers/races
    // would resolve to empty and the mapping below would fail.
    mockTable("seasons", { data: null, error: null });
    mockTable("drivers", { data: null, error: null });
    mockTable("races", { data: null, error: null });

    const [prediction] = await fetchUserSprintPredictions(
      supabase,
      USER_ID,
      [makeRace(9001, 1)],
      ctx
    );
    expect(prediction.raceId).toBe(9001);
    expect(prediction.status).toBe("pending");
  });
});
