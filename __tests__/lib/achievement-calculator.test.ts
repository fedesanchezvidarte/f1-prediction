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

/* ── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Sets up the minimum mock tables for a single user evaluation.
 * Callers can override specific tables after calling this.
 */
function setupBaseTablesForUser(
  mockTable: ReturnType<typeof createMockSupabase>["mockTable"],
  overrides: Partial<{
    achievements: unknown;
    racePredictions: unknown[];
    sprintPredictions: unknown[];
    championPredictions: unknown;
    raceResults: unknown;
    sprintResults: unknown;
    seasons: unknown;
    teamBestDriverPredictions: unknown;
    races: unknown;
    userAchievements: unknown[];
  }> = {}
) {
  const {
    achievements = { data: [], error: null },
    racePredictions = [
      { data: [], error: null },
      { data: [], error: null },
    ],
    sprintPredictions = [
      { data: [], error: null },
      { data: [], error: null },
    ],
    championPredictions = { data: [], error: null },
    raceResults = { data: [], error: null },
    sprintResults = { data: [], error: null },
    seasons = { data: { id: 1 }, error: null },
    teamBestDriverPredictions = { data: [], error: null },
    races = { data: [], error: null },
    userAchievements = [{ data: [], error: null }],
  } = overrides;

  mockTable("achievements", achievements as never);
  mockTable("race_predictions", ...(racePredictions as [never, ...never[]]));
  mockTable("sprint_predictions", ...(sprintPredictions as [never, ...never[]]));
  mockTable("champion_predictions", championPredictions as never);
  mockTable("race_results", raceResults as never);
  mockTable("sprint_results", sprintResults as never);
  mockTable("seasons", seasons as never);
  mockTable("team_best_driver_predictions", teamBestDriverPredictions as never);
  mockTable("races", races as never);
  mockTable("user_achievements", ...(userAchievements as [never, ...never[]]));
}

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

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "first_prediction", threshold: 1 },
          { id: 2, slug: "100_points", threshold: 100 },
        ],
        error: null,
      },
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.usersProcessed).toBe(1);
    expect(result.achievementsAwarded).toBe(0);
    expect(result.achievementsRevoked).toBe(0);
  });

  it("awards first_prediction achievement when user has predictions", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "first_prediction", threshold: 1 }],
        error: null,
      },
      racePredictions: [
        { data: [], error: null }, // ranking pre-fetch
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
      ],
      userAchievements: [
        { data: [], error: null },   // current
        { data: null, error: null },  // insert success
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.usersProcessed).toBe(1);
    expect(result.achievementsAwarded).toBe(1);
  });

  it("revokes achievements that are no longer valid", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "100_points", threshold: 100 }],
        error: null,
      },
      userAchievements: [
        { data: [{ id: 999, achievement_id: 1 }], error: null }, // currently has it
        { data: null, error: null }, // delete success
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.usersProcessed).toBe(1);
    expect(result.achievementsRevoked).toBe(1);
  });

  /* ── Race analysis achievements ──────────────────────────────────── */

  it("awards predict_race_winner when prediction matches race winner", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "predict_race_winner", threshold: null }],
        error: null,
      },
      racePredictions: [
        // ranking pre-fetch (all scored race predictions)
        {
          data: [{ race_id: 1, user_id: "user-a", points_earned: 10 }],
          error: null,
        },
        // user's race predictions
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "scored",
              points_earned: 10,
              pole_position_driver_id: 1,
              top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              fastest_lap_driver_id: 2,
              fastest_pit_stop_driver_id: 3,
              driver_of_the_day_driver_id: 4,
            },
          ],
          error: null,
        },
      ],
      raceResults: {
        data: [
          {
            race_id: 1,
            pole_position_driver_id: 99,
            top_10: [1, 20, 30, 40, 50, 60, 70, 80, 90, 100], // winner matches
            fastest_lap_driver_id: 99,
            fastest_pit_stop_driver_id: 99,
            driver_of_the_day_driver_id: null,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(1);
  });

  it("awards multiple race accuracy achievements in one pass", async () => {
    const { supabase, mockTable } = createMockSupabase();

    // Set up a scored prediction that matches pole, fastest lap, fastest pit, dotd
    const sharedTop10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "predict_pole", threshold: null },
          { id: 2, slug: "predict_fastest_lap", threshold: null },
          { id: 3, slug: "predict_fastest_pit", threshold: null },
          { id: 4, slug: "fans_choice", threshold: null },
          { id: 5, slug: "1_correct", threshold: 1 },
        ],
        error: null,
      },
      racePredictions: [
        {
          data: [{ race_id: 1, user_id: "user-a", points_earned: 20 }],
          error: null,
        },
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "scored",
              points_earned: 20,
              pole_position_driver_id: 10,
              top_10: sharedTop10,
              fastest_lap_driver_id: 20,
              fastest_pit_stop_driver_id: 30,
              driver_of_the_day_driver_id: 40,
            },
          ],
          error: null,
        },
      ],
      raceResults: {
        data: [
          {
            race_id: 1,
            pole_position_driver_id: 10,
            top_10: sharedTop10, // all positions match
            fastest_lap_driver_id: 20,
            fastest_pit_stop_driver_id: 30,
            driver_of_the_day_driver_id: 40,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    // Should earn all 5: predict_pole, predict_fastest_lap, predict_fastest_pit, fans_choice, 1_correct
    expect(result.achievementsAwarded).toBe(5);
  });

  it("awards perfect_podium and perfect_top_10 for exact matches", async () => {
    const { supabase, mockTable } = createMockSupabase();

    const exactTop10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "perfect_podium", threshold: null },
          { id: 2, slug: "perfect_top_10", threshold: null },
        ],
        error: null,
      },
      racePredictions: [
        {
          data: [{ race_id: 1, user_id: "user-a", points_earned: 42 }],
          error: null,
        },
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "scored",
              points_earned: 42,
              pole_position_driver_id: 1,
              top_10: exactTop10,
              fastest_lap_driver_id: 2,
              fastest_pit_stop_driver_id: 3,
              driver_of_the_day_driver_id: 4,
            },
          ],
          error: null,
        },
      ],
      raceResults: {
        data: [
          {
            race_id: 1,
            pole_position_driver_id: 1,
            top_10: exactTop10,
            fastest_lap_driver_id: 2,
            fastest_pit_stop_driver_id: 3,
            driver_of_the_day_driver_id: 4,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(2);
  });

  it("awards hat_trick when pole + winner + fastest lap all correct in same race", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "hat_trick", threshold: null }],
        error: null,
      },
      racePredictions: [
        {
          data: [{ race_id: 1, user_id: "user-a", points_earned: 10 }],
          error: null,
        },
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "scored",
              points_earned: 10,
              pole_position_driver_id: 44,
              top_10: [44, 2, 3, 4, 5, 6, 7, 8, 9, 10], // winner = 44
              fastest_lap_driver_id: 55,
              fastest_pit_stop_driver_id: 99,
              driver_of_the_day_driver_id: null,
            },
          ],
          error: null,
        },
      ],
      raceResults: {
        data: [
          {
            race_id: 1,
            pole_position_driver_id: 44, // pole matches
            top_10: [44, 20, 30, 40, 50, 60, 70, 80, 90, 100], // winner matches
            fastest_lap_driver_id: 55, // fastest lap matches
            fastest_pit_stop_driver_id: 1,
            driver_of_the_day_driver_id: null,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(1);
  });

  /* ── Sprint analysis achievements ────────────────────────────────── */

  it("awards sprint achievements for correct predictions", async () => {
    const { supabase, mockTable } = createMockSupabase();

    const sprintTop8 = [1, 2, 3, 4, 5, 6, 7, 8];

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "sprint_winner", threshold: null },
          { id: 2, slug: "sprint_pole", threshold: null },
          { id: 3, slug: "sprint_fastest_lap", threshold: null },
          { id: 4, slug: "sprint_podium", threshold: null },
          { id: 5, slug: "perfect_top_8", threshold: null },
        ],
        error: null,
      },
      sprintPredictions: [
        // ranking pre-fetch
        {
          data: [{ race_id: 1, user_id: "user-a", points_earned: 20 }],
          error: null,
        },
        // user's sprint predictions
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "scored",
              points_earned: 20,
              sprint_pole_driver_id: 10,
              top_8: sprintTop8,
              fastest_lap_driver_id: 20,
            },
          ],
          error: null,
        },
      ],
      sprintResults: {
        data: [
          {
            race_id: 1,
            sprint_pole_driver_id: 10,
            top_8: sprintTop8, // exact match
            fastest_lap_driver_id: 20,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    // sprint_winner, sprint_pole, sprint_fastest_lap, sprint_podium, perfect_top_8
    expect(result.achievementsAwarded).toBe(5);
  });

  /* ── Championship achievements ───────────────────────────────────── */

  it("awards predict_wdc and predict_wcc for correct champion predictions", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "predict_wdc", threshold: null },
          { id: 2, slug: "predict_wcc", threshold: null },
        ],
        error: null,
      },
      championPredictions: {
        data: [
          {
            user_id: "user-a",
            status: "scored",
            points_earned: 40,
            wdc_correct: true,
            wcc_correct: true,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(2);
  });

  /* ── Points milestones ───────────────────────────────────────────── */

  it("awards points milestones based on total scored points", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "100_points", threshold: 100 },
          { id: 2, slug: "200_points", threshold: 200 },
          { id: 3, slug: "300_points", threshold: 300 },
        ],
        error: null,
      },
      racePredictions: [
        { data: [], error: null },
        {
          data: [
            { race_id: 1, user_id: "user-a", status: "scored", points_earned: 150, pole_position_driver_id: 1, top_10: [], fastest_lap_driver_id: 1, fastest_pit_stop_driver_id: 1, driver_of_the_day_driver_id: 1 },
          ],
          error: null,
        },
      ],
      raceResults: {
        data: [{ race_id: 1, pole_position_driver_id: 99, top_10: [], fastest_lap_driver_id: 99, fastest_pit_stop_driver_id: 99, driver_of_the_day_driver_id: null }],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    // Only 100_points should be earned (150 >= 100, but < 200)
    expect(result.achievementsAwarded).toBe(1);
  });

  /* ── Correct positions milestones ────────────────────────────────── */

  it("awards correct position milestones (1_correct, 10_correct)", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "1_correct", threshold: 1 },
          { id: 2, slug: "10_correct", threshold: 10 },
        ],
        error: null,
      },
      racePredictions: [
        { data: [{ race_id: 1, user_id: "user-a", points_earned: 5 }], error: null },
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "scored",
              points_earned: 5,
              pole_position_driver_id: 1,
              top_10: [1, 2, 3, 99, 99, 99, 99, 99, 99, 99], // 3 correct
              fastest_lap_driver_id: 1,
              fastest_pit_stop_driver_id: 1,
              driver_of_the_day_driver_id: 1,
            },
          ],
          error: null,
        },
      ],
      raceResults: {
        data: [
          {
            race_id: 1,
            pole_position_driver_id: 99,
            top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            fastest_lap_driver_id: 99,
            fastest_pit_stop_driver_id: 99,
            driver_of_the_day_driver_id: null,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    // 3 correct positions: earns 1_correct but not 10_correct
    expect(result.achievementsAwarded).toBe(1);
  });

  /* ── Leaderboard placement achievements ──────────────────────────── */

  it("awards race_prediction_winner when user has highest points for a race", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "race_prediction_winner", threshold: 1 },
          { id: 2, slug: "race_prediction_podium", threshold: 1 },
        ],
        error: null,
      },
      racePredictions: [
        // ranking pre-fetch: user-a has highest, others lower
        {
          data: [
            { race_id: 1, user_id: "user-a", points_earned: 30 },
            { race_id: 1, user_id: "user-b", points_earned: 20 },
            { race_id: 1, user_id: "user-c", points_earned: 10 },
          ],
          error: null,
        },
        // user's own predictions
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "scored",
              points_earned: 30,
              pole_position_driver_id: 99,
              top_10: [99, 99, 99, 99, 99, 99, 99, 99, 99, 99],
              fastest_lap_driver_id: 99,
              fastest_pit_stop_driver_id: 99,
              driver_of_the_day_driver_id: null,
            },
          ],
          error: null,
        },
      ],
      raceResults: {
        data: [
          {
            race_id: 1,
            pole_position_driver_id: 1,
            top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            fastest_lap_driver_id: 1,
            fastest_pit_stop_driver_id: 1,
            driver_of_the_day_driver_id: null,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    // Should earn race_prediction_winner and race_prediction_podium
    expect(result.achievementsAwarded).toBe(2);
  });

  it("awards sprint_prediction_winner and sprint_prediction_podium", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "sprint_prediction_winner", threshold: 1 },
          { id: 2, slug: "sprint_prediction_podium", threshold: 1 },
        ],
        error: null,
      },
      sprintPredictions: [
        // ranking pre-fetch
        {
          data: [
            { race_id: 1, user_id: "user-a", points_earned: 20 },
            { race_id: 1, user_id: "user-b", points_earned: 10 },
          ],
          error: null,
        },
        // user's sprint predictions
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "scored",
              points_earned: 20,
              sprint_pole_driver_id: 99,
              top_8: [99, 99, 99, 99, 99, 99, 99, 99],
              fastest_lap_driver_id: 99,
            },
          ],
          error: null,
        },
      ],
      sprintResults: {
        data: [
          {
            race_id: 1,
            sprint_pole_driver_id: 1,
            top_8: [1, 2, 3, 4, 5, 6, 7, 8],
            fastest_lap_driver_id: 1,
          },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(2);
  });

  /* ── Team best driver achievements ───────────────────────────────── */

  it("awards predict_1_team_best when user has a correct team best prediction", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "predict_1_team_best", threshold: 1 },
          { id: 2, slug: "predict_5_team_best", threshold: 5 },
        ],
        error: null,
      },
      teamBestDriverPredictions: {
        data: [
          { id: 1, status: "scored", points_earned: 5 },
          { id: 2, status: "scored", points_earned: 0 },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    // 1 correct TBD: earns predict_1_team_best but not predict_5_team_best
    expect(result.achievementsAwarded).toBe(1);
  });

  /* ── all_2026_predictions ────────────────────────────────────────── */

  it("awards all_2026_predictions when user predicted every race in the season", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "all_2026_predictions", threshold: null }],
        error: null,
      },
      racePredictions: [
        { data: [], error: null }, // ranking
        {
          data: [
            { race_id: 10, user_id: "user-a", status: "submitted", points_earned: null, pole_position_driver_id: 1, top_10: [], fastest_lap_driver_id: 1, fastest_pit_stop_driver_id: 1, driver_of_the_day_driver_id: 1 },
            { race_id: 11, user_id: "user-a", status: "submitted", points_earned: null, pole_position_driver_id: 1, top_10: [], fastest_lap_driver_id: 1, fastest_pit_stop_driver_id: 1, driver_of_the_day_driver_id: 1 },
          ],
          error: null,
        },
      ],
      seasons: { data: { id: 1 }, error: null },
      races: {
        data: [{ id: 10 }, { id: 11 }],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(1);
  });

  it("does not award all_2026_predictions when user missed a race", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "all_2026_predictions", threshold: null }],
        error: null,
      },
      racePredictions: [
        { data: [], error: null },
        {
          data: [
            { race_id: 10, user_id: "user-a", status: "submitted", points_earned: null, pole_position_driver_id: 1, top_10: [], fastest_lap_driver_id: 1, fastest_pit_stop_driver_id: 1, driver_of_the_day_driver_id: 1 },
          ],
          error: null,
        },
      ],
      seasons: { data: { id: 1 }, error: null },
      races: {
        data: [{ id: 10 }, { id: 11 }, { id: 12 }], // 3 races, user only predicted 1
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(0);
  });

  /* ── Prediction count milestones ─────────────────────────────────── */

  it("awards 10_predictions and 20_predictions based on total count", async () => {
    const { supabase, mockTable } = createMockSupabase();

    // 12 race predictions + 5 sprint predictions + 2 champion + 3 TBD = 22
    const racePreds = Array.from({ length: 12 }, (_, i) => ({
      race_id: i + 1,
      user_id: "user-a",
      status: "submitted",
      points_earned: null,
      pole_position_driver_id: 1,
      top_10: [],
      fastest_lap_driver_id: 1,
      fastest_pit_stop_driver_id: 1,
      driver_of_the_day_driver_id: 1,
    }));

    const sprintPreds = Array.from({ length: 5 }, (_, i) => ({
      race_id: i + 100,
      user_id: "user-a",
      status: "submitted",
      points_earned: null,
      sprint_pole_driver_id: 1,
      top_8: [],
      fastest_lap_driver_id: 1,
    }));

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [
          { id: 1, slug: "10_predictions", threshold: 10 },
          { id: 2, slug: "20_predictions", threshold: 20 },
        ],
        error: null,
      },
      racePredictions: [
        { data: [], error: null },
        { data: racePreds, error: null },
      ],
      sprintPredictions: [
        { data: [], error: null },
        { data: sprintPreds, error: null },
      ],
      championPredictions: {
        data: [
          { user_id: "user-a", status: "submitted", points_earned: null, wdc_correct: null, wcc_correct: null },
          { user_id: "user-a", status: "submitted", points_earned: null, wdc_correct: null, wcc_correct: null },
        ],
        error: null,
      },
      teamBestDriverPredictions: {
        data: [
          { id: 1, status: "submitted", points_earned: null },
          { id: 2, status: "submitted", points_earned: null },
          { id: 3, status: "submitted", points_earned: null },
        ],
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    // 22 total predictions: earns both 10_predictions and 20_predictions
    expect(result.achievementsAwarded).toBe(2);
  });

  /* ── Reconciliation error paths ──────────────────────────────────── */

  it("handles insert error gracefully (logs but does not crash)", async () => {
    const { supabase, mockTable } = createMockSupabase();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "first_prediction", threshold: 1 }],
        error: null,
      },
      racePredictions: [
        { data: [], error: null },
        {
          data: [
            {
              race_id: 1,
              user_id: "user-a",
              status: "submitted",
              points_earned: null,
              pole_position_driver_id: 1,
              top_10: [1],
              fastest_lap_driver_id: 1,
              fastest_pit_stop_driver_id: 1,
              driver_of_the_day_driver_id: 1,
            },
          ],
          error: null,
        },
      ],
      userAchievements: [
        { data: [], error: null },
        { data: null, error: { message: "insert failed" } }, // insert error
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(0); // error means 0 awarded
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles delete error gracefully during revocation", async () => {
    const { supabase, mockTable } = createMockSupabase();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "100_points", threshold: 100 }],
        error: null,
      },
      userAchievements: [
        { data: [{ id: 999, achievement_id: 1 }], error: null },
        { data: null, error: { message: "delete failed" } }, // delete error
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsRevoked).toBe(0); // error means 0 revoked
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  /* ── race_prediction_winner_10 ───────────────────────────────────── */

  it("awards race_prediction_winner_10 when user wins 10 race leaderboards", async () => {
    const { supabase, mockTable } = createMockSupabase();

    // Create 10 races where user-a wins each leaderboard
    const rankingData = Array.from({ length: 10 }, (_, i) => ({
      race_id: i + 1,
      user_id: "user-a",
      points_earned: 30,
    }));

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "race_prediction_winner_10", threshold: 10 }],
        error: null,
      },
      racePredictions: [
        { data: rankingData, error: null }, // rankings
        {
          data: rankingData.map((r) => ({
            ...r,
            status: "scored",
            pole_position_driver_id: 99,
            top_10: [99, 99, 99, 99, 99, 99, 99, 99, 99, 99],
            fastest_lap_driver_id: 99,
            fastest_pit_stop_driver_id: 99,
            driver_of_the_day_driver_id: null,
          })),
          error: null,
        },
      ],
      raceResults: {
        data: rankingData.map((r) => ({
          race_id: r.race_id,
          pole_position_driver_id: 1,
          top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          fastest_lap_driver_id: 1,
          fastest_pit_stop_driver_id: 1,
          driver_of_the_day_driver_id: null,
        })),
        error: null,
      },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(1);
  });

  /* ── predict_10_team_best ────────────────────────────────────────── */

  it("awards predict_10_team_best when user has 10+ correct team predictions", async () => {
    const { supabase, mockTable } = createMockSupabase();

    const tbdPreds = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      status: "scored",
      points_earned: 5,
    }));

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "predict_10_team_best", threshold: 10 }],
        error: null,
      },
      teamBestDriverPredictions: { data: tbdPreds, error: null },
      userAchievements: [
        { data: [], error: null },
        { data: null, error: null },
      ],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(1);
  });

  /* ── Scored predictions without matching results ─────────────────── */

  it("handles scored race prediction with no matching result gracefully", async () => {
    const { supabase, mockTable } = createMockSupabase();

    setupBaseTablesForUser(mockTable, {
      achievements: {
        data: [{ id: 1, slug: "predict_race_winner", threshold: null }],
        error: null,
      },
      racePredictions: [
        { data: [], error: null },
        {
          data: [
            {
              race_id: 999, // no matching result
              user_id: "user-a",
              status: "scored",
              points_earned: 5,
              pole_position_driver_id: 1,
              top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
              fastest_lap_driver_id: 1,
              fastest_pit_stop_driver_id: 1,
              driver_of_the_day_driver_id: 1,
            },
          ],
          error: null,
        },
      ],
      raceResults: { data: [], error: null }, // no results at all
      userAchievements: [{ data: [], error: null }],
    });

    const result = await calculateAchievementsForUsers(supabase, ["user-a"]);
    expect(result.achievementsAwarded).toBe(0);
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

  it("collects user IDs from team_best_driver_predictions too", async () => {
    const { supabase, mockTable } = createMockSupabase();

    mockTable("race_predictions",
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("sprint_predictions",
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("champion_predictions",
      { data: [], error: null },
      { data: [], error: null },
    );
    mockTable("team_best_driver_predictions",
      { data: [{ user_id: "user-tbd" }], error: null },
      { data: [], error: null },
    );

    mockTable("achievements", { data: [], error: null });

    const result = await calculateAchievementsForAllUsers(supabase);
    // User found but no achievements → early return
    expect(result.usersProcessed).toBe(0);
  });
});
