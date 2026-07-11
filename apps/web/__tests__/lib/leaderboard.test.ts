/**
 * Tests for packages/shared/lib/leaderboard.ts — pure helpers directly,
 * fetchDetailedLeaderboard with mocked Supabase.
 *
 * Query order inside fetchDetailedLeaderboard (matters for the mock queues):
 *   1. profiles
 *   2. leaderboard
 *   3. seasons (is_current, .single())
 *   4. races   (id, meeting_key map)
 *   5. race_predictions + sprint_predictions (Promise.all)
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import {
  buildLeaderboardEntries,
  buildRacePointsMap,
  fetchDetailedLeaderboard,
  rankLeaderboardEntries,
  type LeaderboardProfileRow,
  type LeaderboardTotalsRow,
  type ScoredPredictionRow,
} from "@f1/shared/lib/leaderboard";
import type { Race } from "@f1/shared/types";

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

const RACES = [makeRace(9001, 1), makeRace(9002, 2)];

/** DB race id 501 -> meeting key 9001, 502 -> 9002. */
const RACE_ID_TO_KEY = new Map<number, number>([
  [501, 9001],
  [502, 9002],
]);

function makeEntry(
  userId: string,
  displayName: string,
  totalPoints: number
): Omit<import("@f1/shared/types").DetailedLeaderboardEntry, "rank"> {
  return { userId, displayName, totalPoints, predictionsCount: 0, racePoints: {} };
}

describe("buildRacePointsMap", () => {
  it("maps scored race predictions to meeting keys, preserving null points_earned", () => {
    const racePreds: ScoredPredictionRow[] = [
      { user_id: "u1", race_id: 501, points_earned: 42 },
      { user_id: "u1", race_id: 502, points_earned: null },
    ];
    const map = buildRacePointsMap(racePreds, [], RACE_ID_TO_KEY);
    expect(map).toEqual({ u1: { 9001: 42, 9002: null } });
  });

  it("adds sprint points on top of race points for the same meeting key", () => {
    const racePreds: ScoredPredictionRow[] = [
      { user_id: "u1", race_id: 501, points_earned: 40 },
    ];
    const sprintPreds: ScoredPredictionRow[] = [
      { user_id: "u1", race_id: 501, points_earned: 12 },
    ];
    const map = buildRacePointsMap(racePreds, sprintPreds, RACE_ID_TO_KEY);
    expect(map.u1[9001]).toBe(52);
  });

  it("treats a sprint-only race as 0 + sprint points (and null sprint points as 0)", () => {
    const sprintPreds: ScoredPredictionRow[] = [
      { user_id: "u1", race_id: 501, points_earned: 8 },
      { user_id: "u2", race_id: 502, points_earned: null },
    ];
    const map = buildRacePointsMap([], sprintPreds, RACE_ID_TO_KEY);
    expect(map.u1[9001]).toBe(8);
    expect(map.u2[9002]).toBe(0);
  });

  it("skips rows whose race_id has no meeting-key mapping (other seasons)", () => {
    const racePreds: ScoredPredictionRow[] = [
      { user_id: "u1", race_id: 999, points_earned: 30 },
    ];
    const sprintPreds: ScoredPredictionRow[] = [
      { user_id: "u1", race_id: 998, points_earned: 5 },
    ];
    expect(buildRacePointsMap(racePreds, sprintPreds, RACE_ID_TO_KEY)).toEqual({});
  });
});

describe("buildLeaderboardEntries", () => {
  const profiles: LeaderboardProfileRow[] = [
    { id: "u1", display_name: "Alice" },
    { id: "u2", display_name: null },
  ];

  it("defaults users without a leaderboard row to 0 points and 0 predictions", () => {
    const rows: LeaderboardTotalsRow[] = [
      { user_id: "u1", total_points: 120, predictions_count: 5 },
    ];
    const entries = buildLeaderboardEntries(profiles, rows, {}, [9001]);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ userId: "u1", totalPoints: 120, predictionsCount: 5 });
    expect(entries[1]).toMatchObject({ userId: "u2", totalPoints: 0, predictionsCount: 0 });
  });

  it("falls back to 'Driver' when display_name is null", () => {
    const entries = buildLeaderboardEntries(profiles, [], {}, []);
    expect(entries[1].displayName).toBe("Driver");
  });

  it("fills a race-points cell for every meeting key, null when unscored", () => {
    const racePointsMap = { u1: { 9001: 42 } };
    const entries = buildLeaderboardEntries(profiles, [], racePointsMap, [9001, 9002]);
    expect(entries[0].racePoints).toEqual({ 9001: 42, 9002: null });
    expect(entries[1].racePoints).toEqual({ 9001: null, 9002: null });
  });
});

describe("rankLeaderboardEntries", () => {
  it("sorts by points descending, breaking ties alphabetically by display name", () => {
    const ranked = rankLeaderboardEntries([
      makeEntry("u1", "Zoe", 50),
      makeEntry("u2", "Alice", 80),
      makeEntry("u3", "Bob", 50),
    ]);
    expect(ranked.map((e) => e.displayName)).toEqual(["Alice", "Bob", "Zoe"]);
  });

  it("shares the rank between tied point totals (competition ranking)", () => {
    const ranked = rankLeaderboardEntries([
      makeEntry("u1", "Alice", 80),
      makeEntry("u2", "Bob", 50),
      makeEntry("u3", "Cara", 50),
      makeEntry("u4", "Dan", 10),
    ]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it("does not mutate the input array", () => {
    const input = [makeEntry("u1", "Bob", 10), makeEntry("u2", "Alice", 90)];
    rankLeaderboardEntries(input);
    expect(input[0].displayName).toBe("Bob");
  });
});

describe("fetchDetailedLeaderboard", () => {
  function setupBase() {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable("races", {
      data: [
        { id: 501, meeting_key: 9001 },
        { id: 502, meeting_key: 9002 },
      ],
      error: null,
    });
    return { supabase, mockTable };
  }

  it("returns an empty array when there are no profiles", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("profiles", { data: [], error: null });
    mockTable("leaderboard", { data: [], error: null });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });

    const entries = await fetchDetailedLeaderboard(supabase, RACES);
    expect(entries).toEqual([]);
  });

  it("assembles ranked entries with merged race+sprint per-race points", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("profiles", {
      data: [
        { id: "u1", display_name: "Alice" },
        { id: "u2", display_name: "Bob" },
      ],
      error: null,
    });
    mockTable("leaderboard", {
      data: [
        { user_id: "u1", total_points: 52, predictions_count: 2 },
        { user_id: "u2", total_points: 70, predictions_count: 1 },
      ],
      error: null,
    });
    mockTable("race_predictions", {
      data: [
        { user_id: "u1", race_id: 501, points_earned: 40 },
        { user_id: "u2", race_id: 502, points_earned: 70 },
      ],
      error: null,
    });
    mockTable("sprint_predictions", {
      data: [{ user_id: "u1", race_id: 501, points_earned: 12 }],
      error: null,
    });

    const entries = await fetchDetailedLeaderboard(supabase, RACES);

    expect(entries.map((e) => e.userId)).toEqual(["u2", "u1"]);
    expect(entries[0]).toMatchObject({
      rank: 1,
      totalPoints: 70,
      racePoints: { 9001: null, 9002: 70 },
    });
    expect(entries[1]).toMatchObject({
      rank: 2,
      totalPoints: 52,
      racePoints: { 9001: 52, 9002: null },
    });
  });

  it("includes every profile, defaulting users without leaderboard rows to 0 points", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("profiles", {
      data: [
        { id: "u1", display_name: "Alice" },
        { id: "u2", display_name: "Newbie" },
      ],
      error: null,
    });
    mockTable("leaderboard", {
      data: [{ user_id: "u1", total_points: 30, predictions_count: 1 }],
      error: null,
    });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });

    const entries = await fetchDetailedLeaderboard(supabase, RACES);

    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({
      userId: "u2",
      rank: 2,
      totalPoints: 0,
      predictionsCount: 0,
      racePoints: { 9001: null, 9002: null },
    });
  });

  it("assigns shared ranks to tied totals across all profiles", async () => {
    const { supabase, mockTable } = setupBase();
    mockTable("profiles", {
      data: [
        { id: "u1", display_name: "Alice" },
        { id: "u2", display_name: "Bob" },
        { id: "u3", display_name: "Cara" },
      ],
      error: null,
    });
    mockTable("leaderboard", {
      data: [
        { user_id: "u1", total_points: 50, predictions_count: 1 },
        { user_id: "u2", total_points: 50, predictions_count: 1 },
      ],
      error: null,
    });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });

    const entries = await fetchDetailedLeaderboard(supabase, RACES);
    expect(entries.map((e) => e.rank)).toEqual([1, 1, 3]);
  });
});
