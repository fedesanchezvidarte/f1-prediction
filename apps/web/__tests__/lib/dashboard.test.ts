/**
 * Tests for packages/shared/lib/dashboard.ts — buildDashboardPredictions
 * (pure) directly, fetchDashboardData with mocked Supabase.
 *
 * Query order inside fetchDashboardData (matters for the mock queues):
 *   Promise.all builds the chains in order — the two `.single()` calls consume
 *   synchronously while the array literal is evaluated, the list thenables
 *   consume when Promise.all awaits them:
 *     1. profiles (.single(), user profile)   — first "profiles" queue entry
 *     2. seasons  (.single(), is_current)
 *     3. race_predictions (user rows)
 *     4. sprint_predictions (user rows)
 *     5. profiles (ordered list, all users)   — second "profiles" queue entry
 *     6. leaderboard (totals rows)
 *   Then: races (id, meeting_key map, scoped to the current season).
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import {
  buildDashboardPredictions,
  fetchDashboardData,
  type UserPredictionRow,
} from "@f1/shared/lib/dashboard";
import type { Race } from "@f1/shared/types";

const USER_ID = "user-123";
const SEASON_ID = 7;

function makeRace(
  meetingKey: number,
  round: number,
  hasSprint = false,
  dates: { start: string; end: string } = {
    start: "2026-03-01T00:00:00Z",
    end: "2026-03-03T00:00:00Z",
  }
): Race {
  return {
    meetingKey,
    raceName: `Race ${round}`,
    officialName: `Official Race ${round}`,
    circuitShortName: `Circuit ${round}`,
    countryName: "Country",
    countryCode: "CC",
    location: "Location",
    dateStart: dates.start,
    dateEnd: dates.end,
    sprintDateEnd: hasSprint ? dates.start : null,
    round,
    hasSprint,
  };
}

/** DB race id 501 -> meeting key 9001, 502 -> 9002. */
const RACE_ID_TO_KEY = new Map<number, number>([
  [501, 9001],
  [502, 9002],
]);

function raceRow(
  race_id: number,
  status: string | null,
  points_earned: number | null = null
): UserPredictionRow {
  return { race_id, status, points_earned };
}

describe("buildDashboardPredictions", () => {
  describe("status", () => {
    it("returns a pending entry with undefined points when the user has no rows", () => {
      const [pred] = buildDashboardPredictions([makeRace(9001, 1)], [], [], RACE_ID_TO_KEY);
      expect(pred).toEqual({
        raceId: 9001,
        raceName: "Race 1",
        round: 1,
        status: "pending",
        top10: [],
        pointsEarned: undefined,
        maxPoints: 42,
      });
    });

    it("is scored once the race prediction is scored, even when the sprint is pending", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [raceRow(501, "scored", 30)],
        [],
        RACE_ID_TO_KEY
      );
      expect(pred.status).toBe("scored");
    });

    it("stays pending on a sprint weekend when only the race prediction is submitted", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [raceRow(501, "submitted")],
        [],
        RACE_ID_TO_KEY
      );
      expect(pred.status).toBe("pending");
    });

    it("stays pending on a sprint weekend when only the sprint prediction is submitted", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [],
        [raceRow(501, "submitted")],
        RACE_ID_TO_KEY
      );
      expect(pred.status).toBe("pending");
    });

    it("is submitted on a sprint weekend when race and sprint are both submitted", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [raceRow(501, "submitted")],
        [raceRow(501, "submitted")],
        RACE_ID_TO_KEY
      );
      expect(pred.status).toBe("submitted");
    });

    it("is submitted on a sprint weekend when the race is submitted and the sprint already scored", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [raceRow(501, "submitted")],
        [raceRow(501, "scored", 8)],
        RACE_ID_TO_KEY
      );
      expect(pred.status).toBe("submitted");
    });

    it("is submitted on a non-sprint weekend from the race prediction alone", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, false)],
        [raceRow(501, "submitted")],
        [],
        RACE_ID_TO_KEY
      );
      expect(pred.status).toBe("submitted");
    });
  });

  describe("points", () => {
    it("sums race and sprint points on a sprint weekend", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [raceRow(501, "scored", 30)],
        [raceRow(501, "scored", 12)],
        RACE_ID_TO_KEY
      );
      expect(pred.pointsEarned).toBe(42);
    });

    it("treats null race points as 0 when the sprint is scored", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [raceRow(501, "submitted", null)],
        [raceRow(501, "scored", 8)],
        RACE_ID_TO_KEY
      );
      expect(pred.pointsEarned).toBe(8);
    });

    it("uses race points alone when the sprint has null points", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [raceRow(501, "scored", 25)],
        [raceRow(501, "submitted", null)],
        RACE_ID_TO_KEY
      );
      expect(pred.pointsEarned).toBe(25);
    });

    it("keeps a scored 0 (not undefined)", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1)],
        [raceRow(501, "scored", 0)],
        [],
        RACE_ID_TO_KEY
      );
      expect(pred.pointsEarned).toBe(0);
    });

    it("is undefined when neither race nor sprint has points", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, true)],
        [raceRow(501, "submitted", null)],
        [raceRow(501, "submitted", null)],
        RACE_ID_TO_KEY
      );
      expect(pred.pointsEarned).toBeUndefined();
    });

    it("ignores sprint points and status on a non-sprint weekend", () => {
      const [pred] = buildDashboardPredictions(
        [makeRace(9001, 1, false)],
        [raceRow(501, "scored", 20)],
        [raceRow(501, "scored", 99)],
        RACE_ID_TO_KEY
      );
      expect(pred.pointsEarned).toBe(20);
      expect(pred.status).toBe("scored");
    });
  });

  it("counts sprint points from a row with a null status without affecting the combined status", () => {
    const [pred] = buildDashboardPredictions(
      [makeRace(9001, 1, true)],
      [raceRow(501, "submitted")],
      [raceRow(501, null, 5)],
      RACE_ID_TO_KEY
    );
    expect(pred.pointsEarned).toBe(5);
    expect(pred.status).toBe("pending"); // null sprint status is not "submitted"
  });

  it("ignores race and sprint rows whose race_id has no meeting-key mapping", () => {
    const [pred] = buildDashboardPredictions(
      [makeRace(9001, 1, true)],
      [raceRow(999, "scored", 30)],
      [raceRow(998, "scored", 12)],
      RACE_ID_TO_KEY
    );
    expect(pred.status).toBe("pending");
    expect(pred.pointsEarned).toBeUndefined();
  });

  it("returns one entry per race, matched by meeting key", () => {
    const races = [makeRace(9001, 1), makeRace(9002, 2)];
    const preds = buildDashboardPredictions(
      races,
      [raceRow(502, "scored", 15)],
      [],
      RACE_ID_TO_KEY
    );
    expect(preds).toHaveLength(2);
    expect(preds[0]).toMatchObject({ raceId: 9001, status: "pending" });
    expect(preds[1]).toMatchObject({ raceId: 9002, status: "scored", pointsEarned: 15 });
  });
});

describe("fetchDashboardData", () => {
  // Fixed "now": race 1 is in the past, race 2 in the future.
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-01T00:00:00Z"));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const PAST = { start: "2026-03-01T00:00:00Z", end: "2026-03-03T00:00:00Z" };
  const FUTURE = { start: "2026-09-01T00:00:00Z", end: "2026-09-03T00:00:00Z" };
  const RACES = [makeRace(9001, 1, true, PAST), makeRace(9002, 2, false, FUTURE)];

  const DB_RACES = [
    { id: 501, meeting_key: 9001 },
    { id: 502, meeting_key: 9002 },
  ];

  function setupBase() {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable("races", { data: DB_RACES, error: null });
    return { supabase, mockTable };
  }

  it("assembles the full dashboard: profile, stats, leaderboard, predictions, calendar, next race", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable(
      "profiles",
      { data: { display_name: "Alice", avatar_url: "https://a/img.png" }, error: null },
      {
        data: [
          { id: USER_ID, display_name: "Alice" },
          { id: "u2", display_name: "Bob" },
        ],
        error: null,
      }
    );
    mockTable("race_predictions", {
      data: [raceRow(501, "scored", 30), raceRow(502, "submitted", null)],
      error: null,
    });
    mockTable("sprint_predictions", {
      data: [raceRow(501, "scored", 12)],
      error: null,
    });
    mockTable("leaderboard", {
      data: [
        { user_id: USER_ID, total_points: 42, predictions_count: 2 },
        { user_id: "u2", total_points: 70, predictions_count: 1 },
      ],
      error: null,
    });

    const data = await fetchDashboardData(supabase, USER_ID, RACES);

    expect(data.profile).toEqual({
      displayName: "Alice",
      avatarUrl: "https://a/img.png",
    });
    expect(data.userStats).toEqual({ totalPoints: 42, rank: 2, totalUsers: 2 });

    expect(data.leaderboard).toEqual([
      { rank: 1, userId: "u2", displayName: "Bob", totalPoints: 70, predictionsCount: 1 },
      { rank: 2, userId: USER_ID, displayName: "Alice", totalPoints: 42, predictionsCount: 2 },
    ]);

    expect(data.predictions).toHaveLength(2);
    expect(data.predictions[0]).toMatchObject({
      raceId: 9001,
      status: "scored",
      pointsEarned: 42, // 30 race + 12 sprint
    });
    expect(data.predictions[1]).toMatchObject({
      raceId: 9002,
      status: "submitted",
      pointsEarned: undefined,
    });

    expect(data.calendarEntries.map((e) => e.race.round)).toEqual([1, 2]);
    expect(data.calendarEntries.map((e) => e.predictionStatus)).toEqual([
      "scored",
      "submitted",
    ]);

    expect(data.nextRace?.meetingKey).toBe(9002);
  });

  it("slices the ranked leaderboard to the top 10 while totalUsers counts everyone", async () => {
    const { supabase, mockTable } = setupBase();
    const profiles = Array.from({ length: 12 }, (_, i) => ({
      id: `u${String(i + 1).padStart(2, "0")}`,
      display_name: `User ${String(i + 1).padStart(2, "0")}`,
    }));
    // u01 has the most points, descending from there; u12 (the current user) has none.
    const totals = profiles.slice(0, 11).map((p, i) => ({
      user_id: p.id,
      total_points: 120 - i * 10,
      predictions_count: 1,
    }));
    mockTable("profiles", { data: { display_name: "Me", avatar_url: null }, error: null }, {
      data: profiles,
      error: null,
    });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard", { data: totals, error: null });

    const data = await fetchDashboardData(supabase, "u12", RACES);

    expect(data.leaderboard).toHaveLength(10);
    expect(data.leaderboard[0]).toMatchObject({ rank: 1, userId: "u01", totalPoints: 120 });
    expect(data.leaderboard[9]).toMatchObject({ rank: 10, userId: "u10", totalPoints: 30 });
    // Current user is outside the top 10 but still ranked and counted.
    expect(data.userStats).toEqual({ totalPoints: 0, rank: 12, totalUsers: 12 });
  });

  it("shares ranks between tied totals (competition ranking)", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("profiles", { data: null, error: null }, {
      data: [
        { id: USER_ID, display_name: "Alice" },
        { id: "u2", display_name: "Bob" },
        { id: "u3", display_name: "Cara" },
      ],
      error: null,
    });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard", {
      data: [
        { user_id: USER_ID, total_points: 50, predictions_count: 1 },
        { user_id: "u2", total_points: 50, predictions_count: 1 },
        { user_id: "u3", total_points: 10, predictions_count: 1 },
      ],
      error: null,
    });

    const data = await fetchDashboardData(supabase, USER_ID, RACES);

    expect(data.leaderboard.map((e) => e.rank)).toEqual([1, 1, 3]);
    expect(data.userStats.rank).toBe(1);
  });

  it("gives a user without a leaderboard row 0 points but a real rank", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("profiles", { data: { display_name: "Newbie", avatar_url: null }, error: null }, {
      data: [
        { id: USER_ID, display_name: "Newbie" },
        { id: "u2", display_name: "Veteran" },
      ],
      error: null,
    });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard", {
      data: [{ user_id: "u2", total_points: 55, predictions_count: 2 }],
      error: null,
    });

    const data = await fetchDashboardData(supabase, USER_ID, RACES);

    expect(data.userStats).toEqual({ totalPoints: 0, rank: 2, totalUsers: 2 });
    expect(data.leaderboard[1]).toMatchObject({ userId: USER_ID, totalPoints: 0 });
  });

  it("handles empty profiles/leaderboard and no races gracefully", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("profiles", { data: null, error: null }, { data: [], error: null });
    mockTable("race_predictions", { data: null, error: null });
    mockTable("sprint_predictions", { data: null, error: null });
    mockTable("seasons", { data: null, error: null });
    mockTable("leaderboard", { data: null, error: null });
    mockTable("races", { data: null, error: null });

    const data = await fetchDashboardData(supabase, USER_ID, []);

    expect(data.profile).toEqual({ displayName: null, avatarUrl: null });
    expect(data.userStats).toEqual({ totalPoints: 0, rank: 0, totalUsers: 0 });
    expect(data.leaderboard).toEqual([]);
    expect(data.predictions).toEqual([]);
    expect(data.calendarEntries).toEqual([]);
    expect(data.nextRace).toBeNull();
  });

  /** Wraps supabase.from to record .eq() filters applied to the "races" query. */
  interface LooseChain {
    eq: (col: string, val: unknown) => unknown;
  }
  interface LooseClient {
    from: (table: string) => { select: (cols?: string) => LooseChain };
  }

  function spyOnRacesFilters(supabase: ReturnType<typeof createMockSupabase>["supabase"]) {
    const eqCalls: [string, unknown][] = [];
    const client = supabase as unknown as LooseClient;
    const originalFrom = client.from.bind(client);
    client.from = (table: string) => {
      const api = originalFrom(table);
      if (table !== "races") return api;
      return {
        ...api,
        select: (cols?: string) => {
          const chain = api.select(cols);
          const originalEq = chain.eq.bind(chain);
          chain.eq = (col: string, val: unknown) => {
            eqCalls.push([col, val]);
            return originalEq(col, val);
          };
          return chain;
        },
      };
    };
    return eqCalls;
  }

  it("scopes the raceId→meetingKey races query to the current season id", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("profiles", { data: null, error: null }, { data: [], error: null });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard", { data: [], error: null });
    const eqCalls = spyOnRacesFilters(supabase);

    await fetchDashboardData(supabase, USER_ID, RACES);

    expect(eqCalls).toEqual([["season_id", SEASON_ID]]);
  });

  it("falls back to an impossible season id (-1) when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });
    mockTable("races", { data: [], error: null });
    mockTable("profiles", { data: null, error: null }, { data: [], error: null });
    mockTable("race_predictions", { data: [raceRow(501, "scored", 30)], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard", { data: [], error: null });
    const eqCalls = spyOnRacesFilters(supabase);

    const data = await fetchDashboardData(supabase, USER_ID, RACES);

    expect(eqCalls).toEqual([["season_id", -1]]);
    // With an empty mapping the scored row cannot be attributed to any race.
    expect(data.predictions.map((p) => p.status)).toEqual(["pending", "pending"]);
  });
});
