import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreRacePrediction, scoreSprintPrediction } from "@/lib/scoring";

/**
 * Scores all submitted predictions for a given race (and sprint if applicable).
 * This should be called after race results are inserted/updated in the database.
 *
 * Body: { raceId: number } — this is the DB races.id, NOT meeting_key
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin =
    (user.app_metadata?.role === "admin") ||
    (process.env.ADMIN_USER_IDS?.split(",").includes(user.id));

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { raceId } = body as { raceId: number };

  if (!raceId) {
    return NextResponse.json({ error: "raceId is required" }, { status: 400 });
  }

  const raceScored = await scoreRacePredictions(supabase, raceId);
  const sprintScored = await scoreSprintPredictions(supabase, raceId);

  const affectedUserIds = new Set<string>([
    ...raceScored.userIds,
    ...sprintScored.userIds,
  ]);

  if (affectedUserIds.size > 0) {
    await updateLeaderboard(supabase, Array.from(affectedUserIds), raceScored.perfectPodiumUsers);
  }

  return NextResponse.json({
    success: true,
    racePredictionsScored: raceScored.count,
    sprintPredictionsScored: sprintScored.count,
  });
}

async function scoreRacePredictions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raceId: number
) {
  const { data: result } = await supabase
    .from("race_results")
    .select("pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id")
    .eq("race_id", raceId)
    .single();

  if (!result) {
    return { count: 0, userIds: [] as string[], perfectPodiumUsers: [] as string[] };
  }

  const { data: predictions } = await supabase
    .from("race_predictions")
    .select("id, user_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id")
    .eq("race_id", raceId)
    .eq("status", "submitted");

  if (!predictions || predictions.length === 0) {
    return { count: 0, userIds: [] as string[], perfectPodiumUsers: [] as string[] };
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
      resultTop10,
      resultPole: result.pole_position_driver_id,
      resultFastestLap: result.fastest_lap_driver_id,
      resultFastestPitStop: result.fastest_pit_stop_driver_id,
    });

    await supabase
      .from("race_predictions")
      .update({
        points_earned: breakdown.total,
        status: "scored",
      })
      .eq("id", pred.id);

    userIds.push(pred.user_id);
    if (breakdown.perfectPodium) {
      perfectPodiumUsers.push(pred.user_id);
    }
  }

  return { count: predictions.length, userIds, perfectPodiumUsers };
}

async function scoreSprintPredictions(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
    .select("id, user_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id")
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

    await supabase
      .from("sprint_predictions")
      .update({
        points_earned: breakdown.total,
        status: "scored",
      })
      .eq("id", pred.id);

    userIds.push(pred.user_id);
  }

  return { count: predictions.length, userIds };
}

async function updateLeaderboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

    const racePoints = (racePreds ?? []).map((p) => p.points_earned ?? 0);
    const sprintPoints = (sprintPreds ?? []).map((p) => p.points_earned ?? 0);
    const champPoints = champPred?.points_earned ?? 0;

    const totalPoints =
      racePoints.reduce((s, p) => s + p, 0) +
      sprintPoints.reduce((s, p) => s + p, 0) +
      champPoints;

    const predictionsCount = racePoints.length + sprintPoints.length + (champPred ? 1 : 0);
    const bestRacePoints = racePoints.length > 0 ? Math.max(...racePoints) : 0;

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
      await supabase
        .from("leaderboard")
        .update(leaderboardData)
        .eq("id", existingLb.id);
    } else {
      await supabase.from("leaderboard").insert(leaderboardData);
    }
  }

  // Recalculate ranks for all users in the season using batch upsert
  const { data: allLb } = await supabase
    .from("leaderboard")
    .select("id, total_points")
    .eq("season_id", season.id)
    .order("total_points", { ascending: false });

  if (allLb && allLb.length > 0) {
    let currentRank = 1;
    const updates: { id: number; rank: number }[] = [];

    for (let i = 0; i < allLb.length; i++) {
      if (i > 0 && allLb[i].total_points < allLb[i - 1].total_points) {
        currentRank = i + 1;
      }
      updates.push({ id: allLb[i].id, rank: currentRank });
    }

    await supabase.from("leaderboard").upsert(updates, { onConflict: "id" });
  }
}
