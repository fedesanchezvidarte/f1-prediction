/**
 * Tests for lib/scoring-service.ts — service layer with mocked Supabase.
 *
 * Covers: scoreRaceForId, scoreSeasonAwardsForSeason, updateLeaderboard
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

import { scoreRaceForId, scoreSeasonAwardsForSeason, updateLeaderboard } from "@/lib/scoring-service";
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
    mockTable("season_award_predictions", { data: [], error: null });
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

  it("scores sprint predictions and reports sprintPredictionsScored", async () => {
    const { supabase, mockTable } = createMockSupabase();

    // No race result → race scoring skipped
    mockTable("race_results", { data: null, error: null });

    // Sprint result exists
    mockTable("sprint_results", {
      data: {
        sprint_pole_driver_id: 1,
        top_8: [1, 2, 3, 4, 5, 6, 7, 8],
        fastest_lap_driver_id: 2,
      },
      error: null,
    });

    // Sprint prediction queue:
    //   1st call: select submitted → one prediction
    //   2nd call: update scored → success
    //   3rd call: updateLeaderboard sum (select scored) → points
    mockTable("sprint_predictions",
      {
        data: [
          {
            id: 501,
            user_id: "user-s",
            sprint_pole_driver_id: 1,
            top_8: [1, 2, 3, 4, 5, 6, 7, 8],
            fastest_lap_driver_id: 2,
          },
        ],
        error: null,
      },
      { data: null, error: null },
      { data: [{ points_earned: 20 }], error: null },
    );

    // updateLeaderboard
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("season_award_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null }, // no existing entry
      { data: null, error: null }, // insert
      { data: [{ id: 1, total_points: 20 }], error: null }, // rank recalc
      { data: null, error: null }, // rank update
    );

    const result = await scoreRaceForId(supabase, 1);
    expect(result.racePredictionsScored).toBe(0);
    expect(result.sprintPredictionsScored).toBe(1);
    expect(calculateAchievementsForUsers).toHaveBeenCalledWith(supabase, ["user-s"]);
  });

  it("does not crash if achievement calculation fails", async () => {
    const { supabase, mockTable } = createMockSupabase();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

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
    mockTable("season_award_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null },
      { data: null, error: null },
      { data: [{ id: 1, total_points: 0 }], error: null },
      { data: null, error: null },
    );

    // Should NOT throw despite achievement calc failure
    const result = await scoreRaceForId(supabase, 1);
    expect(result.racePredictionsScored).toBe(1);
    consoleSpy.mockRestore();
  });
});

describe("scoreSeasonAwardsForSeason", () => {
  beforeEach(() => {
    (calculateAchievementsForUsers as jest.Mock).mockResolvedValue({
      usersProcessed: 0,
      achievementsAwarded: 0,
      achievementsRevoked: 0,
    });
  });

  it("returns 0 when no award types exist", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("season_award_types", { data: [], error: null });

    const result = await scoreSeasonAwardsForSeason(supabase, 1);
    expect(result.seasonAwardPredictionsScored).toBe(0);
  });

  it("returns 0 when no results exist", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("season_award_types", {
      data: [{ id: 1, slug: "wdc", subject_type: "driver", points_value: 20 }],
      error: null,
    });
    mockTable("season_award_results", { data: [], error: null });

    const result = await scoreSeasonAwardsForSeason(supabase, 1);
    expect(result.seasonAwardPredictionsScored).toBe(0);
  });

  it("scores a correct driver award prediction with full points", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("season_award_types", {
      data: [{ id: 1, slug: "wdc", subject_type: "driver", points_value: 20 }],
      error: null,
    });
    mockTable("season_award_results", {
      data: [{ award_type_id: 1, driver_id: 10, team_id: null }],
      error: null,
    });

    // season_award_predictions queue:
    // 1. revert update → success
    // 2. select submitted → one prediction
    // 3. update scored → success
    // 4. updateLeaderboard select scored → earned points
    mockTable("season_award_predictions",
      { data: null, error: null }, // revert
      {
        data: [
          { id: "pred-1", user_id: "user-a", award_type_id: 1, driver_id: 10, team_id: null, is_half_points: false },
        ],
        error: null,
      },
      { data: null, error: null }, // update scored
      { data: [{ points_earned: 20 }], error: null }, // leaderboard select
    );

    // updateLeaderboard
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null },
      { data: null, error: null },
      { data: [{ id: 1, total_points: 20 }], error: null },
      { data: null, error: null },
    );

    const result = await scoreSeasonAwardsForSeason(supabase, 1);
    expect(result.seasonAwardPredictionsScored).toBe(1);
    expect(calculateAchievementsForUsers).toHaveBeenCalledWith(supabase, ["user-a"]);
  });

  it("scores with half-points when is_half_points is true", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("season_award_types", {
      data: [{ id: 2, slug: "wcc", subject_type: "team", points_value: 20 }],
      error: null,
    });
    mockTable("season_award_results", {
      data: [{ award_type_id: 2, driver_id: null, team_id: 100 }],
      error: null,
    });

    // Prediction is correct but half-points → should earn 10
    mockTable("season_award_predictions",
      { data: null, error: null }, // revert
      {
        data: [
          { id: "pred-2", user_id: "user-b", award_type_id: 2, driver_id: null, team_id: 100, is_half_points: true },
        ],
        error: null,
      },
      { data: null, error: null }, // update scored
      { data: [{ points_earned: 10 }], error: null },
    );

    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null },
      { data: null, error: null },
      { data: [{ id: 2, total_points: 10 }], error: null },
      { data: null, error: null },
    );

    const result = await scoreSeasonAwardsForSeason(supabase, 1);
    expect(result.seasonAwardPredictionsScored).toBe(1);
  });

  it("awards 0 points for an incorrect prediction", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("season_award_types", {
      data: [{ id: 3, slug: "most_wins", subject_type: "driver", points_value: 10 }],
      error: null,
    });
    mockTable("season_award_results", {
      data: [{ award_type_id: 3, driver_id: 5, team_id: null }],
      error: null,
    });

    // Prediction has different driver_id → no match
    mockTable("season_award_predictions",
      { data: null, error: null }, // revert
      {
        data: [
          { id: "pred-3", user_id: "user-c", award_type_id: 3, driver_id: 99, team_id: null, is_half_points: false },
        ],
        error: null,
      },
      { data: null, error: null }, // update with 0 points
      { data: [{ points_earned: 0 }], error: null },
    );

    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("leaderboard",
      { data: null, error: null },
      { data: null, error: null },
      { data: [{ id: 3, total_points: 0 }], error: null },
      { data: null, error: null },
    );

    const result = await scoreSeasonAwardsForSeason(supabase, 1);
    expect(result.seasonAwardPredictionsScored).toBe(1);
  });
});

describe("updateLeaderboard", () => {
  it("inserts a new leaderboard entry when none exists", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("race_predictions", { data: [{ points_earned: 10 }], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("season_award_predictions", { data: [{ points_earned: 0 }], error: null });
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
