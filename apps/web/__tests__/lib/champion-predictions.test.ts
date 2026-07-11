/**
 * Tests for packages/shared/lib/champion-predictions.ts —
 * fetchChampionPredictionData with mocked Supabase.
 *
 * Query order without a passed context (matters for the mock queues):
 *   1. seasons (is_current)              — also re-queried inside fetchDrivers (sticky)
 *   2. drivers (id, driver_number map)   — first "drivers" queue entry
 *   3. races   (id, meeting_key map)
 *   4. drivers (full rows, fetchDrivers) — second "drivers" queue entry
 *   5. season_award_predictions (user rows)
 *   6. teams (WCC team name — only when a wcc award has a team id)
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import { fetchChampionPredictionData } from "@f1/shared/lib/champion-predictions";
import type { TeamWithDrivers } from "@f1/shared/types";

const USER_ID = "user-123";
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

const TEAMS_WITH_DRIVERS: TeamWithDrivers[] = [
  {
    id: 1,
    name: "Alpha",
    color: "112233",
    drivers: [
      { id: 101, driverNumber: 1, firstName: "First1", lastName: "Last1", nameAcronym: "D1" },
      { id: 102, driverNumber: 2, firstName: "First2", lastName: "Last2", nameAcronym: "D2" },
    ],
  },
  {
    id: 2,
    name: "Beta",
    color: "445566",
    drivers: [
      { id: 103, driverNumber: 3, firstName: "First3", lastName: "Last3", nameAcronym: "D3" },
      { id: 104, driverNumber: 4, firstName: "First4", lastName: "Last4", nameAcronym: "D4" },
    ],
  },
];

function makeAwardRow(
  slug: string,
  overrides: Partial<{
    id: string;
    award_type_id: number;
    driver_id: number | null;
    team_id: number | null;
    is_half_points: boolean;
    status: string;
    points_earned: number;
  }> = {}
) {
  return {
    id: `${slug}-row`,
    award_type_id: 1,
    driver_id: null,
    team_id: null,
    is_half_points: false,
    status: "submitted",
    points_earned: 0,
    season_award_types: {
      slug,
      name: slug,
      subject_type: slug === "wcc" ? "team" : "driver",
      scope_team_id: null,
      points_value: 10,
      sort_order: 1,
    },
    ...overrides,
  };
}

function setupBase() {
  const { supabase, mockTable } = createMockSupabase();
  mockTable("seasons", { data: { id: SEASON_ID }, error: null });
  mockTable(
    "drivers",
    { data: DRIVER_ID_ROWS, error: null },
    { data: FULL_DRIVER_ROWS, error: null }
  );
  mockTable("races", { data: [], error: null });
  return { supabase, mockTable };
}

describe("fetchChampionPredictionData", () => {
  it("returns pending placeholders when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    const data = await fetchChampionPredictionData(supabase, USER_ID, TEAMS_WITH_DRIVERS);

    expect(data.seasonAwardPredictions).toEqual([]);
    expect(data.championPrediction.status).toBe("pending");
    expect(data.championPrediction.wdcWinner).toBeNull();
    expect(data.championPrediction.pointsEarned).toBe(0);
    expect(data.teamBestDriverPredictions).toHaveLength(2);
    expect(data.teamBestDriverPredictions[0]).toEqual({
      teamId: 1,
      teamName: "Alpha",
      teamColor: "112233",
      driverId: null,
      driverNumber: null,
      isHalfPoints: false,
      status: "pending",
      pointsEarned: 0,
    });
  });

  it("returns a pending champion prediction when the user has no award rows", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("season_award_predictions", { data: null, error: null });

    const data = await fetchChampionPredictionData(supabase, USER_ID, TEAMS_WITH_DRIVERS);

    expect(data.championPrediction).toEqual({
      userId: USER_ID,
      status: "pending",
      wdcWinner: null,
      wccWinner: null,
      mostDnfsDriver: null,
      mostPodiumsDriver: null,
      mostWinsDriver: null,
      pointsEarned: 0,
      wdcPoints: 0,
      wccPoints: 0,
      mostDnfsPoints: 0,
      mostPodiumsPoints: 0,
      mostWinsPoints: 0,
      isHalfPoints: false,
    });
    expect(data.teamBestDriverPredictions.every((p) => p.status === "pending")).toBe(true);
  });

  it("assembles the champion prediction from award rows and resolves the WCC team name", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("season_award_predictions", {
      data: [
        makeAwardRow("wdc", { driver_id: 101 }),
        makeAwardRow("wcc", { team_id: 2 }),
        makeAwardRow("most_dnfs", { driver_id: 103 }),
        makeAwardRow("most_podiums", { driver_id: 104 }),
        makeAwardRow("most_wins", { driver_id: 105 }),
      ],
      error: null,
    });
    mockTable("teams", { data: { name: "Beta" }, error: null });

    const data = await fetchChampionPredictionData(supabase, USER_ID, TEAMS_WITH_DRIVERS);
    const champ = data.championPrediction;

    expect(champ.status).toBe("submitted");
    expect(champ.wdcWinner?.driverNumber).toBe(1);
    expect(champ.wccWinner).toBe("Beta");
    expect(champ.mostDnfsDriver?.driverNumber).toBe(3);
    expect(champ.mostPodiumsDriver?.driverNumber).toBe(4);
    expect(champ.mostWinsDriver?.driverNumber).toBe(5);
    expect(champ.isHalfPoints).toBe(false);
    expect(data.seasonAwardPredictions).toHaveLength(5);
  });

  it("marks the champion prediction scored and sums per-field points once any award is scored", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("season_award_predictions", {
      data: [
        makeAwardRow("wdc", { driver_id: 101, status: "scored", points_earned: 20 }),
        makeAwardRow("most_wins", { driver_id: 102, status: "scored", points_earned: 10 }),
      ],
      error: null,
    });

    const data = await fetchChampionPredictionData(supabase, USER_ID, TEAMS_WITH_DRIVERS);
    const champ = data.championPrediction;

    expect(champ.status).toBe("scored");
    expect(champ.pointsEarned).toBe(30);
    expect(champ.wdcPoints).toBe(20);
    expect(champ.mostWinsPoints).toBe(10);
    expect(champ.wccPoints).toBe(0);
  });

  it("flags half points when any champion award is half points", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("season_award_predictions", {
      data: [makeAwardRow("wdc", { driver_id: 101, is_half_points: true })],
      error: null,
    });

    const data = await fetchChampionPredictionData(supabase, USER_ID, TEAMS_WITH_DRIVERS);
    expect(data.championPrediction.isHalfPoints).toBe(true);
  });

  it("maps team best driver awards onto the passed teams, resolving driver numbers", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("season_award_predictions", {
      data: [
        makeAwardRow("best_driver_1", {
          driver_id: 102,
          status: "scored",
          points_earned: 5,
          is_half_points: true,
        }),
      ],
      error: null,
    });

    const data = await fetchChampionPredictionData(supabase, USER_ID, TEAMS_WITH_DRIVERS);
    const [alpha, beta] = data.teamBestDriverPredictions;

    expect(alpha.driverId).toBe(102);
    expect(alpha.driverNumber).toBe(2);
    expect(alpha.status).toBe("scored");
    expect(alpha.pointsEarned).toBe(5);
    expect(alpha.isHalfPoints).toBe(true);
    expect(beta.driverId).toBeNull();
    expect(beta.driverNumber).toBeNull();
    expect(beta.status).toBe("pending");
  });

  it("leaves the WCC winner null when the team lookup finds nothing", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("season_award_predictions", {
      data: [makeAwardRow("wcc", { team_id: 99 })],
      error: null,
    });
    mockTable("teams", { data: null, error: null });

    const data = await fetchChampionPredictionData(supabase, USER_ID, TEAMS_WITH_DRIVERS);
    expect(data.championPrediction.wccWinner).toBeNull();
    // The wcc award still counts toward the overall status.
    expect(data.championPrediction.status).toBe("submitted");
  });
});
