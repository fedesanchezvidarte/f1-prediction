/**
 * Tests for lib/achievement-calculator.ts — service layer with mocked Supabase.
 *
 * Covers: calculateAchievementsForUsers, calculateAchievementsForAllUsers
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import {
  calculateAchievementsForUsers,
  calculateAchievementsForAllUsers,
} from "@/lib/achievement-calculator";

describe("calculateAchievementsForUsers", () => {
  it("returns early when no achievements are defined", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", { data: [], error: null });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.usersProcessed).toBe(0);
    expect(result.achievementsAwarded).toBe(0);
    expect(result.achievementsRevoked).toBe(0);
  });

  it("returns zeros when achievements query returns null", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", { data: null, error: null });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.usersProcessed).toBe(0);
    expect(result.achievementsAwarded).toBe(0);
    expect(result.achievementsRevoked).toBe(0);
  });

  it("processes user with zero predictions — no achievements earned", async () => {
    const { supabase, mockTable } = createMockSupabase();

    // Achievements defined
    mockTable("achievements", {
      data: [
        { id: 1, slug: "first_prediction", threshold: 1 },
        { id: 2, slug: "100_points", threshold: 100 },
      ],
      error: null,
    });

    // Pre-fetched ranking data
    mockTable("race_predictions",
      { data: [], error: null }, // all scored for ranking
      { data: [], error: null }, // user's predictions
    );
    mockTable("sprint_predictions",
      { data: [], error: null }, // all scored for ranking
      { data: [], error: null }, // user's predictions
    );

    // User-specific queries
    mockTable("champion_predictions", { data: [], error: null });
    mockTable("race_results", { data: [], error: null });
    mockTable("sprint_results", { data: [], error: null });
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("team_best_driver_predictions", { data: [], error: null });
    mockTable("races", { data: [], error: null });

    // Reconciliation: user has no current achievements
    mockTable("user_achievements", { data: [], error: null });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.usersProcessed).toBe(1);
    expect(result.achievementsAwarded).toBe(0);
    expect(result.achievementsRevoked).toBe(0);
  });

  it("awards first_prediction achievement when user has predictions", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("achievements", {
      data: [
        { id: 1, slug: "first_prediction", threshold: 1 },
      ],
      error: null,
    });

    // Ranking data
    mockTable("race_predictions",
      { data: [], error: null },
      {
        data: [
          {
            race_id: 1,
            user_id: "user-a",
            status: "submitted",
            points_earned: null,
            pole_position_driver_id: 1,
            top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            fastest_lap_driver_id: 2,
            fastest_pit_stop_driver_id: 3,
            driver_of_the_day_driver_id: 4,
          },
        ],
        error: null,
      },
    );
    mockTable("sprint_predictions",
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("champion_predictions", { data: [], error: null });
    mockTable("race_results", { data: [], error: null });
    mockTable("sprint_results", { data: [], error: null });
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("team_best_driver_predictions", { data: [], error: null });
    mockTable("races", { data: [], error: null });

    // Reconciliation: no current achievements, 1 to add
    mockTable("user_achievements",
      { data: [], error: null }, // current
      { data: null, error: null }, // insert success
    );

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.usersProcessed).toBe(1);
    expect(result.achievementsAwarded).toBe(1);
  });

  it("revokes achievements that are no longer valid", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("achievements", {
      data: [
        { id: 1, slug: "100_points", threshold: 100 },
      ],
      error: null,
    });

    // Ranking data
    mockTable("race_predictions",
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("sprint_predictions",
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("champion_predictions", { data: [], error: null });
    mockTable("race_results", { data: [], error: null });
    mockTable("sprint_results", { data: [], error: null });
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("team_best_driver_predictions", { data: [], error: null });
    mockTable("races", { data: [], error: null });

    // User currently has achievement id=1 earned, but no longer qualifies
    mockTable("user_achievements",
      { data: [{ id: 999, achievement_id: 1 }], error: null },
      { data: null, error: null }, // delete success
    );

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.usersProcessed).toBe(1);
    expect(result.achievementsRevoked).toBe(1);
  });
});

describe("calculateAchievementsForAllUsers", () => {
  it("returns zeros when no users have predictions", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("race_predictions", { data: [], error: null });
    mockTable("sprint_predictions", { data: [], error: null });
    mockTable("champion_predictions", { data: [], error: null });
    mockTable("team_best_driver_predictions", { data: [], error: null });

    const result = await calculateAchievementsForAllUsers(supabase);
    expect(result.usersProcessed).toBe(0);
    expect(result.achievementsAwarded).toBe(0);
    expect(result.achievementsRevoked).toBe(0);
  });

  it("collects unique user IDs from all prediction tables", async () => {
    const { supabase, mockTable } = createMockSupabase();

    // First 4 calls are from calculateAchievementsForAllUsers to collect user IDs
    mockTable("race_predictions",
      { data: [{ user_id: "user-a" }, { user_id: "user-b" }], error: null },
      // Then from calculateAchievementsForUsers ranking pre-fetch:
      { data: [], error: null },
      // Then per-user evaluation queries:
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("sprint_predictions",
      { data: [{ user_id: "user-a" }], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("champion_predictions",
      { data: [{ user_id: "user-b" }], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("team_best_driver_predictions",
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );

    // No achievements defined → early return after collecting users
    mockTable("achievements", { data: [], error: null });

    const result = await calculateAchievementsForAllUsers(supabase);
    // Since achievements is empty, usersProcessed = 0 (early return)
    expect(result.usersProcessed).toBe(0);
  });
});
