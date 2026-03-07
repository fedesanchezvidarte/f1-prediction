/**
 * Server-side scoring service.
 * Performs the DB queries and updates for scoring predictions.
 * Shared by /api/results/score and /api/results/manual routes.
 */
import { scoreRacePrediction, scoreSprintPrediction, scoreSeasonAward } from "@/lib/scoring";
import {
  calculateAchievementsForUsers,
  type AchievementCalculationResult,
} from "@/lib/achievement-calculator";

type SupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

export interface ScoringResult {
  racePredictionsScored: number;
  sprintPredictionsScored: number;
  achievements?: AchievementCalculationResult;
}

export async function scoreRaceForId(
  supabase: SupabaseClient,
  raceId: number
): Promise<ScoringResult> {
  const raceScored = await scoreRacePredictions(supabase, raceId);
  const sprintScored = await scoreSprintPredictions(supabase, raceId);

  const affectedUserIds = new Set<string>([
    ...raceScored.userIds,
    ...sprintScored.userIds,
  ]);

  let achievements: AchievementCalculationResult | undefined;

  if (affectedUserIds.size > 0) {
    const userIdArray = Array.from(affectedUserIds);

    await updateLeaderboard(
      supabase,
      userIdArray,
      raceScored.perfectPodiumUsers
    );

    // Auto-calculate achievements for all affected users.
    // Errors here should not cause the overall scoring operation to fail.
    try {
      achievements = await calculateAchievementsForUsers(supabase, userIdArray);
    } catch (error) {
      console.error(
        "[scoring] Failed to calculate achievements for users",
        { userIds: userIdArray, error }
      );
    }
  }

  return {
    racePredictionsScored: raceScored.count,
    sprintPredictionsScored: sprintScored.count,
    achievements,
  };
}

async function scoreRacePredictions(
  supabase: SupabaseClient,
  raceId: number
) {
  const { data: result } = await supabase
    .from("race_results")
    .select(
      "pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, driver_of_the_day_driver_id"
    )
    .eq("race_id", raceId)
    .single();

  if (!result) {
    return {
      count: 0,
      userIds: [] as string[],
      perfectPodiumUsers: [] as string[],
    };
  }

  const { data: predictions } = await supabase
    .from("race_predictions")
    .select(
      "id, user_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, driver_of_the_day_driver_id"
    )
    .eq("race_id", raceId)
    .eq("status", "submitted");

  if (!predictions || predictions.length === 0) {
    return {
      count: 0,
      userIds: [] as string[],
      perfectPodiumUsers: [] as string[],
    };
  }

  const resultTop10: number[] = result.top_10 ?? [];
  const userIds: string[] = [];
  const perfectPodiumUsers: string[] = [];

  for (const pred of predictions) {
    const predTop10: (number | null)[] = pred.top_10 ?? [];

    const breakdown = scoreRacePrediction({
      predTop10,
      predPole: pred.pole_position_driver_id,
      predFastestLap: pred.fastest_lap_driver_id,
      predFastestPitStop: pred.fastest_pit_stop_driver_id,
      predDriverOfTheDay: pred.driver_of_the_day_driver_id,
      resultTop10,
      resultPole: result.pole_position_driver_id,
      resultFastestLap: result.fastest_lap_driver_id,
      resultFastestPitStop: result.fastest_pit_stop_driver_id,
      resultDriverOfTheDay: result.driver_of_the_day_driver_id,
    });

    const { error } = await supabase
      .from("race_predictions")
      .update({
        points_earned: breakdown.total,
        status: "scored",
      })
      .eq("id", pred.id);

    if (error) {
      throw new Error(
        `Failed to update race prediction ${pred.id}: ${error.message}`
      );
    }

    userIds.push(pred.user_id);
    if (breakdown.perfectPodium) {
      perfectPodiumUsers.push(pred.user_id);
    }
  }

  return { count: predictions.length, userIds, perfectPodiumUsers };
}

async function scoreSprintPredictions(
  supabase: SupabaseClient,
  raceId: number
) {
  const { data: result } = await supabase
    .from("sprint_results")
    .select("sprint_pole_driver_id, top_8, fastest_lap_driver_id")
    .eq("race_id", raceId)
    .single();

  if (!result) {
    return { count: 0, userIds: [] as string[] };
  }

  const { data: predictions } = await supabase
    .from("sprint_predictions")
    .select(
      "id, user_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id"
    )
    .eq("race_id", raceId)
    .eq("status", "submitted");

  if (!predictions || predictions.length === 0) {
    return { count: 0, userIds: [] as string[] };
  }

  const resultTop8: number[] = result.top_8 ?? [];
  const userIds: string[] = [];

  for (const pred of predictions) {
    const predTop8: (number | null)[] = pred.top_8 ?? [];

    const breakdown = scoreSprintPrediction({
      predTop8,
      predSprintPole: pred.sprint_pole_driver_id,
      predFastestLap: pred.fastest_lap_driver_id,
      resultTop8,
      resultSprintPole: result.sprint_pole_driver_id,
      resultFastestLap: result.fastest_lap_driver_id,
    });

    const { error } = await supabase
      .from("sprint_predictions")
      .update({
        points_earned: breakdown.total,
        status: "scored",
      })
      .eq("id", pred.id);

    if (error) {
      throw new Error(
        `Failed to update sprint prediction ${pred.id}: ${error.message}`
      );
    }

    userIds.push(pred.user_id);
  }

  return { count: predictions.length, userIds };
}

export async function updateLeaderboard(
  supabase: SupabaseClient,
  userIds: string[],
  perfectPodiumUsers: string[]
) {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return;

  const perfectPodiumSet = new Set(perfectPodiumUsers);

  for (const userId of userIds) {
    const { data: racePreds } = await supabase
      .from("race_predictions")
      .select("points_earned")
      .eq("user_id", userId)
      .eq("status", "scored");

    const { data: sprintPreds } = await supabase
      .from("sprint_predictions")
      .select("points_earned")
      .eq("user_id", userId)
      .eq("status", "scored");

    const { data: seasonAwardPreds } = await supabase
      .from("season_award_predictions")
      .select("points_earned")
      .eq("user_id", userId)
      .eq("status", "scored")
      .eq("season_id", season.id);

    const racePoints = (racePreds ?? []).map((p) => p.points_earned ?? 0);
    const sprintPoints = (sprintPreds ?? []).map((p) => p.points_earned ?? 0);
    const seasonAwardPoints = (seasonAwardPreds ?? []).reduce((s, p) => s + (p.points_earned ?? 0), 0);

    const totalPoints =
      racePoints.reduce((s, p) => s + p, 0) +
      sprintPoints.reduce((s, p) => s + p, 0) +
      seasonAwardPoints;

    const predictionsCount =
      racePoints.length + sprintPoints.length + (seasonAwardPreds?.length ?? 0);
    const bestRacePoints =
      racePoints.length > 0 ? Math.max(...racePoints) : 0;

    const { data: existingLb } = await supabase
      .from("leaderboard")
      .select("id, perfect_podiums")
      .eq("user_id", userId)
      .eq("season_id", season.id)
      .single();

    const currentPerfectPodiums = existingLb?.perfect_podiums ?? 0;
    const newPerfectPodiums = perfectPodiumSet.has(userId)
      ? currentPerfectPodiums + 1
      : currentPerfectPodiums;

    const leaderboardData = {
      user_id: userId,
      season_id: season.id,
      total_points: totalPoints,
      predictions_count: predictionsCount,
      perfect_podiums: newPerfectPodiums,
      best_race_points: bestRacePoints,
      rank: 0,
    };

    if (existingLb) {
      const { error: updateError } = await supabase
        .from("leaderboard")
        .update(leaderboardData)
        .eq("id", existingLb.id);
      if (updateError) {
        throw new Error(
          `Failed to update leaderboard for user ${userId}: ${updateError.message}`
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from("leaderboard")
        .insert(leaderboardData);
      if (insertError) {
        throw new Error(
          `Failed to insert leaderboard for user ${userId}: ${insertError.message}`
        );
      }
    }
  }

  // Recalculate ranks
  const { data: allLb } = await supabase
    .from("leaderboard")
    .select("id, total_points")
    .eq("season_id", season.id)
    .order("total_points", { ascending: false });

  if (allLb && allLb.length > 0) {
    let currentRank = 1;

    for (let i = 0; i < allLb.length; i++) {
      if (i > 0 && allLb[i].total_points < allLb[i - 1].total_points) {
        currentRank = i + 1;
      }

      const { error: updateError } = await supabase
        .from("leaderboard")
        .update({ rank: currentRank })
        .eq("id", allLb[i].id);

      if (updateError) {
        throw new Error(
          `Failed to recalculate leaderboard ranks: ${updateError.message}`
        );
      }
    }
  }
}

export async function scoreSeasonAwardsForSeason(
  supabase: SupabaseClient,
  seasonId: number
): Promise<{ seasonAwardPredictionsScored: number }> {
  // Fetch all award types for the season
  const { data: awardTypes } = await supabase
    .from("season_award_types")
    .select("id, slug, subject_type, points_value")
    .eq("season_id", seasonId);

  if (!awardTypes || awardTypes.length === 0) {
    return { seasonAwardPredictionsScored: 0 };
  }

  const awardTypeMap = new Map(awardTypes.map((at) => [at.id, at]));

  // Fetch all results for this season
  const { data: results } = await supabase
    .from("season_award_results")
    .select("award_type_id, driver_id, team_id")
    .eq("season_id", seasonId);

  if (!results || results.length === 0) {
    return { seasonAwardPredictionsScored: 0 };
  }

  const resultMap = new Map(results.map((r) => [r.award_type_id, r]));

  // Collect user IDs from currently-scored predictions before reverting,
  // so we can always recalculate their leaderboard even if their award
  // result was removed (e.g. driver disqualification).
  const { data: previouslyScored } = await supabase
    .from("season_award_predictions")
    .select("user_id")
    .eq("season_id", seasonId)
    .eq("status", "scored");

  const previouslyScoredUserIds = [
    ...new Set((previouslyScored ?? []).map((p) => p.user_id)),
  ];

  // Revert previously scored predictions so we can re-score them fresh
  const { error: revertError } = await supabase
    .from("season_award_predictions")
    .update({ status: "submitted", points_earned: 0 })
    .eq("season_id", seasonId)
    .eq("status", "scored");

  if (revertError) {
    throw new Error(`Failed to revert season award predictions: ${revertError.message}`);
  }

  // Fetch all submitted predictions
  const { data: predictions } = await supabase
    .from("season_award_predictions")
    .select("id, user_id, award_type_id, driver_id, team_id, is_half_points")
    .eq("season_id", seasonId)
    .eq("status", "submitted");

  if (!predictions || predictions.length === 0) {
    // Even with no predictions to score, previously-scored users need
    // their leaderboard recalculated (their points were just zeroed out).
    if (previouslyScoredUserIds.length > 0) {
      await updateLeaderboard(supabase, previouslyScoredUserIds, []);
      try {
        await calculateAchievementsForUsers(supabase, previouslyScoredUserIds);
      } catch (error) {
        console.error("[scoring] Failed to calculate achievements after season award revert", { error });
      }
    }
    return { seasonAwardPredictionsScored: 0 };
  }

  const userIds: string[] = [];

  for (const pred of predictions) {
    const awardType = awardTypeMap.get(pred.award_type_id);
    const result = resultMap.get(pred.award_type_id);

    if (!awardType || !result) {
      // No result entered for this award type yet — skip
      continue;
    }

    // Determine predicted value and result value based on subject_type
    const predValue = awardType.subject_type === "team" ? pred.team_id : pred.driver_id;
    const resultValue = awardType.subject_type === "team" ? result.team_id : result.driver_id;

    const breakdown = scoreSeasonAward({
      predValue,
      resultValue,
      pointsValue: awardType.points_value,
      isHalfPoints: pred.is_half_points ?? false,
    });

    const { error } = await supabase
      .from("season_award_predictions")
      .update({
        points_earned: breakdown.points,
        status: "scored",
      })
      .eq("id", pred.id);

    if (error) {
      throw new Error(
        `Failed to update season award prediction ${pred.id}: ${error.message}`
      );
    }

    userIds.push(pred.user_id);
  }

  // Merge newly-scored user IDs with previously-scored ones to ensure
  // users whose award result was removed also get their leaderboard updated.
  const allAffectedUserIds = [
    ...new Set([...userIds, ...previouslyScoredUserIds]),
  ];

  if (allAffectedUserIds.length > 0) {
    await updateLeaderboard(supabase, allAffectedUserIds, []);

    try {
      await calculateAchievementsForUsers(supabase, allAffectedUserIds);
    } catch (error) {
      console.error("[scoring] Failed to calculate achievements after season award scoring", { error });
    }
  }

  // Return the actual number of predictions that were scored,
  // not the total submitted (some may lack results and were skipped).
  const { count: scoredCount } = await supabase
    .from("season_award_predictions")
    .select("*", { count: "exact", head: true })
    .eq("season_id", seasonId)
    .eq("status", "scored");

  return { seasonAwardPredictionsScored: scoredCount ?? 0 };
}
