/**
 * Tests for packages/shared/lib/predictions.ts — service layer with mocked Supabase.
 *
 * Covers: fetchUserRacePredictions
 *
 * Query order inside fetchUserRacePredictions (matters for the mock queues):
 *   1. seasons (is_current)              — also re-queried inside fetchDrivers (sticky)
 *   2. drivers (id, driver_number map)   — first "drivers" queue entry
 *   3. races   (id, meeting_key map)
 *   4. drivers (full rows, fetchDrivers) — second "drivers" queue entry
 *   5. race_predictions (user rows)
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import { fetchUserRacePredictions } from "@f1/shared/lib/predictions";
import type { Race } from "@f1/shared/types";

const USER_ID = "user-123";
const SEASON_ID = 7;

function makeRace(meetingKey: number, round: number): Race {
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
    sprintDateEnd: null,
    round,
    hasSprint: false,
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

describe("fetchUserRacePredictions", () => {
  it("returns an empty array when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    const result = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(result).toEqual([]);
  });

  it("returns a pending placeholder with all-null slots for each race when the user has no prediction rows", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", { data: null, error: null });

    const races = [makeRace(9001, 1), makeRace(9002, 2)];
    const result = await fetchUserRacePredictions(supabase, USER_ID, races);

    expect(result).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      expect(result[i]).toEqual({
        raceId: races[i].meetingKey,
        userId: USER_ID,
        status: "pending",
        qualifyingTop3: [null, null, null],
        raceWinner: null,
        restOfTop10: Array(9).fill(null),
        fastestLap: null,
        fastestPitStop: null,
        driverOfTheDay: null,
        pointsEarned: null,
      });
    }
  });

  it("maps a full stored prediction: winner from top_10[0], rest from indexes 1..9, quali, specials, points, status", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 501,
          status: "scored",
          pole_position_driver_id: 103, // must be ignored when qualifying_top_3 is set
          qualifying_top_3: [103, 101, 102],
          top_10: [101, 102, 103, 104, 105, 106, 107, 108, 109, 110],
          fastest_lap_driver_id: 104,
          fastest_pit_stop_driver_id: 105,
          driver_of_the_day_driver_id: 106,
          points_earned: 42,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);

    expect(prediction.raceId).toBe(9001);
    expect(prediction.userId).toBe(USER_ID);
    expect(prediction.status).toBe("scored");
    expect(prediction.pointsEarned).toBe(42);

    expect(prediction.raceWinner?.driverNumber).toBe(1);
    expect(prediction.raceWinner?.nameAcronym).toBe("D1");
    expect(prediction.restOfTop10).toHaveLength(9);
    expect(prediction.restOfTop10.map((d) => d?.driverNumber)).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);

    expect(prediction.qualifyingTop3.map((d) => d?.driverNumber ?? null)).toEqual([3, 1, 2]);
    expect(prediction.fastestLap?.driverNumber).toBe(4);
    expect(prediction.fastestPitStop?.driverNumber).toBe(5);
    expect(prediction.driverOfTheDay?.driverNumber).toBe(6);
  });

  it("resolves full Driver objects with team info", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          pole_position_driver_id: null,
          qualifying_top_3: [101],
          top_10: [101],
          fastest_lap_driver_id: null,
          fastest_pit_stop_driver_id: null,
          driver_of_the_day_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.raceWinner).toEqual({
      driverNumber: 1,
      firstName: "First1",
      lastName: "Last1",
      nameAcronym: "D1",
      teamName: "Team",
      teamColor: "FF0000",
      teamId: 1,
      headshotUrl: undefined,
    });
    expect(prediction.pointsEarned).toBeNull();
  });

  it("falls back to the legacy pole_position_driver_id as Q1 when qualifying_top_3 is null", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          pole_position_driver_id: 107,
          qualifying_top_3: null,
          top_10: [101],
          fastest_lap_driver_id: null,
          fastest_pit_stop_driver_id: null,
          driver_of_the_day_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.qualifyingTop3.map((d) => d?.driverNumber ?? null)).toEqual([7, null, null]);
  });

  it("falls back to the legacy pole_position_driver_id when qualifying_top_3 is an empty array", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          pole_position_driver_id: 108,
          qualifying_top_3: [],
          top_10: [],
          fastest_lap_driver_id: null,
          fastest_pit_stop_driver_id: null,
          driver_of_the_day_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.qualifyingTop3.map((d) => d?.driverNumber ?? null)).toEqual([8, null, null]);
    expect(prediction.raceWinner).toBeNull();
  });

  it("leaves qualifying all-null when both qualifying_top_3 and the legacy pole are empty", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          pole_position_driver_id: null,
          qualifying_top_3: null,
          top_10: [101],
          fastest_lap_driver_id: null,
          fastest_pit_stop_driver_id: null,
          driver_of_the_day_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.qualifyingTop3).toEqual([null, null, null]);
  });

  it("ignores prediction rows whose race_id does not map to a passed race", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 999, // not in the season's races
          status: "scored",
          pole_position_driver_id: 101,
          qualifying_top_3: [101, 102, 103],
          top_10: [101, 102, 103],
          fastest_lap_driver_id: 101,
          fastest_pit_stop_driver_id: 101,
          driver_of_the_day_driver_id: 101,
          points_earned: 99,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.status).toBe("pending");
    expect(prediction.raceWinner).toBeNull();
    expect(prediction.pointsEarned).toBeNull();
  });

  it("resolves unknown driver ids to null while keeping known ones", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          pole_position_driver_id: null,
          qualifying_top_3: [9999, 101, null], // 9999 has no id → number mapping
          top_10: [9999, 102],
          fastest_lap_driver_id: 9999,
          fastest_pit_stop_driver_id: 103,
          driver_of_the_day_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.qualifyingTop3.map((d) => d?.driverNumber ?? null)).toEqual([null, 1, null]);
    expect(prediction.raceWinner).toBeNull();
    expect(prediction.restOfTop10[0]?.driverNumber).toBe(2);
    expect(prediction.fastestLap).toBeNull();
    expect(prediction.fastestPitStop?.driverNumber).toBe(3);
  });

  it("resolves a driver id to null when its driver number has no active driver row", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable(
      "drivers",
      // Mapping knows id 199 → number 99, but the full driver list has no #99
      { data: [...DRIVER_ID_ROWS, { id: 199, driver_number: 99 }], error: null },
      { data: FULL_DRIVER_ROWS, error: null }
    );
    mockTable("races", { data: DB_RACES, error: null });
    mockTable("race_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          pole_position_driver_id: null,
          qualifying_top_3: [199],
          top_10: [199, 101],
          fastest_lap_driver_id: null,
          fastest_pit_stop_driver_id: null,
          driver_of_the_day_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.qualifyingTop3[0]).toBeNull();
    expect(prediction.raceWinner).toBeNull();
    expect(prediction.restOfTop10[0]?.driverNumber).toBe(1);
  });

  it("returns an empty array when no races are passed", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", { data: null, error: null });

    const result = await fetchUserRacePredictions(supabase, USER_ID, []);
    expect(result).toEqual([]);
  });

  it("pads a short top_10 with nulls in the remaining slots", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 501,
          status: "submitted",
          pole_position_driver_id: null,
          qualifying_top_3: [101, 102, 103],
          top_10: [101, 102, 103], // only P1-P3 stored
          fastest_lap_driver_id: null,
          fastest_pit_stop_driver_id: null,
          driver_of_the_day_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const [prediction] = await fetchUserRacePredictions(supabase, USER_ID, [makeRace(9001, 1)]);
    expect(prediction.raceWinner?.driverNumber).toBe(1);
    expect(prediction.restOfTop10.map((d) => d?.driverNumber ?? null)).toEqual([
      2, 3, null, null, null, null, null, null, null,
    ]);
  });

  it("maps predictions for multiple races independently", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("race_predictions", {
      data: [
        {
          race_id: 502,
          status: "submitted",
          pole_position_driver_id: null,
          qualifying_top_3: [101, 102, 103],
          top_10: [104],
          fastest_lap_driver_id: null,
          fastest_pit_stop_driver_id: null,
          driver_of_the_day_driver_id: null,
          points_earned: null,
        },
      ],
      error: null,
    });

    const result = await fetchUserRacePredictions(supabase, USER_ID, [
      makeRace(9001, 1),
      makeRace(9002, 2),
    ]);

    expect(result[0].status).toBe("pending");
    expect(result[0].raceWinner).toBeNull();
    expect(result[1].status).toBe("submitted");
    expect(result[1].raceWinner?.driverNumber).toBe(4);
  });
});
