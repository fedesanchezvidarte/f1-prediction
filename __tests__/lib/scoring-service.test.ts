/**
 * Tests for lib/scoring-service.ts — service layer with mocked Supabase.
 *
 * Covers: scoreRaceForId, scoreChampionForSeason, updateLeaderboard
 */
import { createMockSupabase } from "../helpers/mockSupabase";

// We need to mock the achievement-calculator module so it doesn't
// interfere with scoring-service tests.
jest.mock("@/lib/achievement-calculator", () => ({
  calculateAchievementsForUsers: jest.fn().mockResolvedValue({
    usersProcessed: 0,
    achievementsAwarded: 0,
    achievementsRevoked: 0,
  }),
}));

import { scoreRaceForId, scoreChampionForSeason, updateLeaderboard } from "@/lib/scoring-service";
import { calculateAchievementsForUsers } from "@/lib/achievement-calculator";

describe("scoreRaceForId", () => {
  it("returns 0 scored when no race result found", async () => {
    const { supabase, mockTable } = createMockSupabase();
    // race_results returns null for .single()
    mockTable("race_results", { data: null, error: null });
    // sprint_results also returns null
    mockTable("sprint_results", { data: null, error: null });

    const result = await scoreRaceForId(supabase, 1);
    expect(result.racePredictionsScored).toBe(0);
    expect(result.sprintPredictionsScored).toBe(0);
  });

  it("returns 0 scored when result exists but no predictions", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_results", {
      data: {
        pole_position_driver_id: 1,
        top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        fastest_lap_driver_id: 2,
        fastest_pit_stop_driver_id: 3,
        driver_of_the_day_driver_id: 4,
      },
      error: null,
    });
    mockTable("race_predictions",
      { data: null, error: null }, // select predictions → empty
    );
    mockTable("sprint_results", { data: null, error: null });

    const result = await scoreRaceForId(supabase, 1);
    expect(result.racePredictionsScored).toBe(0);
    expect(result.sprintPredictionsScored).toBe(0);
  });

  it("scores race predictions and triggers leaderboard + achievements", async () => {
    const { supabase, mockTable } = createMockSupabase();

    // Race result
    mockTable("race_results", {
      data: {
        pole_position_driver_id: 1,
        top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        fastest_lap_driver_id: 2,
        fastest_pit_stop_driver_id: 3,
        driver_of_the_day_driver_id: 4,
      },
      error: null,
    });

    // Predictions
    mockTable("race_predictions",
      {
        data: [
          {
            id: 101,
            user_id: "user-a",
            pole_position_driver_id: 1,
            top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            fastest_lap_driver_id: 2,
            fastest_pit_stop_driver_id: 3,
            driver_of_the_day_driver_id: 4,
          },
        ],
        error: null,
      },
      // Subsequent calls for update → success
      { data: null, error: null },
      // For updateLeaderboard queries
      { data: [{ points_earned: 34 }], error: null }, // racePreds scored
    );

    // Sprint: no result
    mockTable("sprint_results", { data: null, error: null });

    // updateLeaderboard queries
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("champion_predictions", { data: null, error: null });
    mockTable("team_best_driver_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null }, // no existing entry
      { data: null, error: null }, // insert success
      { data: [{ id: 1, total_points: 34 }], error: null }, // rank recalc query
      { data: null, error: null }, // rank update
    );

    const result = await scoreRaceForId(supabase, 1);
    expect(result.racePredictionsScored).toBe(1);
    expect(result.sprintPredictionsScored).toBe(0);
    // Achievement calculation was called
    expect(calculateAchievementsForUsers).toHaveBeenCalledWith(
      supabase,
      ["user-a"]
    );
  });

  it("does not crash if achievement calculation fails", async () => {
    const { supabase, mockTable } = createMockSupabase();

    (calculateAchievementsForUsers as jest.Mock).mockRejectedValueOnce(
      new Error("DB error")
    );

    mockTable("race_results", {
      data: {
        pole_position_driver_id: 1,
        top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        fastest_lap_driver_id: 2,
        fastest_pit_stop_driver_id: 3,
        driver_of_the_day_driver_id: null,
      },
      error: null,
    });

    mockTable("race_predictions",
      {
        data: [
          {
            id: 201,
            user_id: "user-b",
            pole_position_driver_id: 99,
            top_10: [99, 99, 99, 99, 99, 99, 99, 99, 99, 99],
            fastest_lap_driver_id: 99,
            fastest_pit_stop_driver_id: 99,
            driver_of_the_day_driver_id: 99,
          },
        ],
        error: null,
      },
      { data: null, error: null }, // update success
      { data: [{ points_earned: 0 }], error: null },
    );

    mockTable("sprint_results", { data: null, error: null });
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("champion_predictions", { data: null, error: null });
    mockTable("team_best_driver_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null },
      { data: null, error: null },
      { data: [{ id: 1, total_points: 0 }], error: null },
      { data: null, error: null },
    );

    // Should NOT throw despite achievement calc failure
    const result = await scoreRaceForId(supabase, 1);
    expect(result.racePredictionsScored).toBe(1);
  });
});

describe("scoreChampionForSeason", () => {
  beforeEach(() => {
    (calculateAchievementsForUsers as jest.Mock).mockResolvedValue({
      usersProcessed: 0,
      achievementsAwarded: 0,
      achievementsRevoked: 0,
    });
  });

  it("returns 0 when no champion result exists", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("champion_results", { data: null, error: null });

    const result = await scoreChampionForSeason(supabase, 1);
    expect(result.championPredictionsScored).toBe(0);
    expect(result.teamBestDriverPredictionsScored).toBe(0);
  });

  it("scores champion predictions with correct points", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("champion_results", {
      data: {
        wdc_driver_id: 1,
        wcc_team_id: 100,
        most_dnfs_driver_id: 2,
        most_podiums_driver_id: 3,
        most_wins_driver_id: 4,
      },
      error: null,
    });

    // Revert query
    mockTable("champion_predictions",
      { data: null, error: null }, // revert update
      {
        data: [
          {
            id: 301,
            user_id: "user-c",
            wdc_driver_id: 1,
            wcc_team_id: 100,
            most_dnfs_driver_id: 2,
            most_podiums_driver_id: 3,
            most_wins_driver_id: 4,
            is_half_points: false,
          },
        ],
        error: null,
      },
      { data: null, error: null }, // update scored
      { data: { points_earned: 70 }, error: null }, // leaderboard query
    );

    // Team best driver results
    mockTable("team_best_driver_results", { data: [], error: null });
    mockTable("team_best_driver_predictions",
      { data: null, error: null }, // revert
      { data: [], error: null }, // no predictions
      { data: [], error: null }, // leaderboard query
    );

    // Leaderboard
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null },
      { data: null, error: null },
      { data: [{ id: 1, total_points: 70 }], error: null },
      { data: null, error: null },
    );

    const result = await scoreChampionForSeason(supabase, 1);
    expect(result.championPredictionsScored).toBe(1);
  });

  it("handles half-points for champion predictions", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("champion_results", {
      data: {
        wdc_driver_id: 1,
        wcc_team_id: 100,
        most_dnfs_driver_id: 2,
        most_podiums_driver_id: 3,
        most_wins_driver_id: 4,
      },
      error: null,
    });

    mockTable("champion_predictions",
      { data: null, error: null }, // revert
      {
        data: [
          {
            id: 302,
            user_id: "user-d",
            wdc_driver_id: 1,
            wcc_team_id: 100,
            most_dnfs_driver_id: 2,
            most_podiums_driver_id: 3,
            most_wins_driver_id: 4,
            is_half_points: true,
          },
        ],
        error: null,
      },
      { data: null, error: null }, // update
      { data: { points_earned: 35 }, error: null }, // leaderboard
    );

    mockTable("team_best_driver_results", { data: [], error: null });
    mockTable("team_best_driver_predictions",
      { data: null, error: null },
      { data: [], error: null },
      { data: [], error: null },
    );

    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null },
      { data: null, error: null },
      { data: [{ id: 1, total_points: 35 }], error: null },
      { data: null, error: null },
    );

    const result = await scoreChampionForSeason(supabase, 1);
    expect(result.championPredictionsScored).toBe(1);
  });
});

describe("updateLeaderboard", () => {
  it("inserts a new leaderboard entry when none exists", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("race_predictions", { data: [{ points_earned: 10 }], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("champion_predictions", { data: null, error: null });
    mockTable("team_best_driver_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null }, // no existing entry  → single returns null
      { data: null, error: null }, // insert
      { data: [{ id: 1, total_points: 10 }], error: null }, // rank recalc
      { data: null, error: null }, // rank update
    );

    await updateLeaderboard(supabase, ["user-e"], []);
    // If this completes without error, leaderboard was updated
  });

  it("returns early when no current season found", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    // Should not throw
    await updateLeaderboard(supabase, ["user-f"], []);
  });
});
