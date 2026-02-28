/**
 * Server-side scoring service.
 * Performs the DB queries and updates for scoring predictions.
 * Shared by /api/results/score and /api/results/manual routes.
 */
import { scoreRacePrediction, scoreSprintPrediction, scoreChampionPrediction } from "@/lib/scoring";
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

    const { data: champPred } = await supabase
      .from("champion_predictions")
      .select("points_earned")
      .eq("user_id", userId)
      .eq("status", "scored")
      .single();

    const { data: tbdPreds } = await supabase
      .from("team_best_driver_predictions")
      .select("points_earned")
      .eq("user_id", userId)
      .eq("status", "scored");

    const racePoints = (racePreds ?? []).map((p) => p.points_earned ?? 0);
    const sprintPoints = (sprintPreds ?? []).map((p) => p.points_earned ?? 0);
    const champPoints = champPred?.points_earned ?? 0;
    const tbdPoints = (tbdPreds ?? []).reduce((s, p) => s + (p.points_earned ?? 0), 0);

    const totalPoints =
      racePoints.reduce((s, p) => s + p, 0) +
      sprintPoints.reduce((s, p) => s + p, 0) +
      champPoints +
      tbdPoints;

    const predictionsCount =
      racePoints.length + sprintPoints.length + (champPred ? 1 : 0);
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

export async function scoreChampionForSeason(
  supabase: SupabaseClient,
  seasonId: number
): Promise<{ championPredictionsScored: number; teamBestDriverPredictionsScored: number }> {
  const { data: result } = await supabase
    .from("champion_results")
    .select("wdc_driver_id, wcc_team_id, most_dnfs_driver_id, most_podiums_driver_id, most_wins_driver_id")
    .eq("season_id", seasonId)
    .single();

  if (!result) return { championPredictionsScored: 0, teamBestDriverPredictionsScored: 0 };

  // Revert previously scored predictions so we can re-score them fresh.
  const { error: revertError } = await supabase
    .from("champion_predictions")
    .update({ status: "submitted", points_earned: 0, wdc_correct: false, wcc_correct: false })
    .eq("season_id", seasonId)
    .eq("status", "scored");

  if (revertError) {
    throw new Error(`Failed to revert champion predictions: ${revertError.message}`);
  }

  const { data: predictions } = await supabase
    .from("champion_predictions")
    .select("id, user_id, wdc_driver_id, wcc_team_id, most_dnfs_driver_id, most_podiums_driver_id, most_wins_driver_id, is_half_points")
    .eq("season_id", seasonId)
    .eq("status", "submitted");

  if (!predictions || predictions.length === 0) {
    // Still score team best drivers
    const tbdResult = await scoreTeamBestDriverPredictions(supabase, seasonId);
    return { championPredictionsScored: 0, teamBestDriverPredictionsScored: tbdResult.count };
  }

  const userIds: string[] = [];

  for (const pred of predictions) {
    const breakdown = scoreChampionPrediction({
      predWdc: pred.wdc_driver_id,
      predWcc: pred.wcc_team_id,
      predMostDnfs: pred.most_dnfs_driver_id,
      predMostPodiums: pred.most_podiums_driver_id,
      predMostWins: pred.most_wins_driver_id,
      resultWdc: result.wdc_driver_id,
      resultWcc: result.wcc_team_id,
      resultMostDnfs: result.most_dnfs_driver_id,
      resultMostPodiums: result.most_podiums_driver_id,
      resultMostWins: result.most_wins_driver_id,
      isHalfPoints: pred.is_half_points ?? false,
    });

    const { error } = await supabase
      .from("champion_predictions")
      .update({
        points_earned: breakdown.total,
        status: "scored",
        wdc_correct: breakdown.wdcMatch,
        wcc_correct: breakdown.wccMatch,
      })
      .eq("id", pred.id);

    if (error) {
      throw new Error(
        `Failed to update champion prediction ${pred.id}: ${error.message}`
      );
    }

    userIds.push(pred.user_id);
  }

  // Score team best driver predictions
  const tbdResult = await scoreTeamBestDriverPredictions(supabase, seasonId);
  const tbdUserIds = tbdResult.userIds;

  const allUserIds = [...new Set([...userIds, ...tbdUserIds])];

  if (allUserIds.length > 0) {
    await updateLeaderboard(supabase, allUserIds, []);

    // Auto-calculate achievements after champion scoring
    try {
      await calculateAchievementsForUsers(supabase, allUserIds);
    } catch (error) {
      console.error("[scoring] Failed to calculate achievements after champion scoring", { error });
    }
  }

  return { championPredictionsScored: predictions.length, teamBestDriverPredictionsScored: tbdResult.count };
}

async function scoreTeamBestDriverPredictions(
  supabase: SupabaseClient,
  seasonId: number
): Promise<{ count: number; userIds: string[] }> {
  // Fetch team best driver results
  const { data: results } = await supabase
    .from("team_best_driver_results")
    .select("team_id, driver_id")
    .eq("season_id", seasonId);

  if (!results || results.length === 0) return { count: 0, userIds: [] };

  const resultMap = new Map<number, number>();
  for (const r of results) {
    resultMap.set(r.team_id, r.driver_id);
  }

  // Revert previously scored team best driver predictions
  const { error: revertError } = await supabase
    .from("team_best_driver_predictions")
    .update({ status: "submitted", points_earned: 0 })
    .eq("season_id", seasonId)
    .eq("status", "scored");

  if (revertError) {
    throw new Error(`Failed to revert team best driver predictions: ${revertError.message}`);
  }

  const { data: predictions } = await supabase
    .from("team_best_driver_predictions")
    .select("id, user_id, team_id, driver_id, is_half_points")
    .eq("season_id", seasonId)
    .eq("status", "submitted");

  if (!predictions || predictions.length === 0) return { count: 0, userIds: [] };

  const userIds: string[] = [];

  for (const pred of predictions) {
    const correctDriverId = resultMap.get(pred.team_id);
    const isMatch = correctDriverId !== undefined && pred.driver_id === correctDriverId;
    const points = isMatch ? (pred.is_half_points ? 1 : 2) : 0;

    const { error } = await supabase
      .from("team_best_driver_predictions")
      .update({ points_earned: points, status: "scored" })
      .eq("id", pred.id);

    if (error) {
      throw new Error(`Failed to update team best driver prediction ${pred.id}: ${error.message}`);
    }

    userIds.push(pred.user_id);
  }

  return { count: predictions.length, userIds: [...new Set(userIds)] };
}
