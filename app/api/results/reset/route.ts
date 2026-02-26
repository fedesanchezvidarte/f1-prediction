import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

/**
 * Resets a race/sprint result for a given race.
 * This deletes the result row, reverts scored predictions back to "submitted",
 * and recalculates leaderboard entries for affected users.
 *
 * Body: { raceId: number, sessionType: "race" | "sprint" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  let body: { raceId?: number; sessionType?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { raceId, sessionType } = body;

  if (!raceId || !Number.isInteger(raceId) || raceId <= 0) {
    return NextResponse.json({ error: "raceId must be a positive integer" }, { status: 400 });
  }

  if (sessionType !== "race" && sessionType !== "sprint") {
    return NextResponse.json({ error: 'sessionType must be "race" or "sprint"' }, { status: 400 });
  }

  try {
    if (sessionType === "race") {
      // Find all users whose race predictions were scored for this race
      const { data: scoredPreds } = await supabase
        .from("race_predictions")
        .select("id, user_id")
        .eq("race_id", raceId)
        .eq("status", "scored");

      const affectedUserIds = (scoredPreds ?? []).map((p) => p.user_id);

      // Revert scored predictions back to "submitted" and clear points
      if (scoredPreds && scoredPreds.length > 0) {
        const { error: updateErr } = await supabase
          .from("race_predictions")
          .update({ status: "submitted", points_earned: null })
          .eq("race_id", raceId)
          .eq("status", "scored");

        if (updateErr) {
          return NextResponse.json({ error: `Failed to revert predictions: ${updateErr.message}` }, { status: 500 });
        }
      }

      // Delete the race result
      const { error: deleteErr } = await supabase
        .from("race_results")
        .delete()
        .eq("race_id", raceId);

      if (deleteErr) {
        return NextResponse.json({ error: `Failed to delete result: ${deleteErr.message}` }, { status: 500 });
      }

      // Recalculate leaderboard for affected users
      if (affectedUserIds.length > 0) {
        await recalculateLeaderboard(supabase, [...new Set(affectedUserIds)]);
      }

      return NextResponse.json({
        success: true,
        predictionsReverted: scoredPreds?.length ?? 0,
      });
    } else {
      // Sprint session
      const { data: scoredPreds } = await supabase
        .from("sprint_predictions")
        .select("id, user_id")
        .eq("race_id", raceId)
        .eq("status", "scored");

      const affectedUserIds = (scoredPreds ?? []).map((p) => p.user_id);

      if (scoredPreds && scoredPreds.length > 0) {
        const { error: updateErr } = await supabase
          .from("sprint_predictions")
          .update({ status: "submitted", points_earned: null })
          .eq("race_id", raceId)
          .eq("status", "scored");

        if (updateErr) {
          return NextResponse.json({ error: `Failed to revert predictions: ${updateErr.message}` }, { status: 500 });
        }
      }

      const { error: deleteErr } = await supabase
        .from("sprint_results")
        .delete()
        .eq("race_id", raceId);

      if (deleteErr) {
        return NextResponse.json({ error: `Failed to delete result: ${deleteErr.message}` }, { status: 500 });
      }

      if (affectedUserIds.length > 0) {
        await recalculateLeaderboard(supabase, [...new Set(affectedUserIds)]);
      }

      return NextResponse.json({
        success: true,
        predictionsReverted: scoredPreds?.length ?? 0,
      });
    }
  } catch (err) {
    console.error("[reset-result] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── Leaderboard recalculation ──────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function recalculateLeaderboard(supabase: SupabaseClient, userIds: string[]) {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return;

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

    const predictionsCount =
      racePoints.length + sprintPoints.length + (champPred ? 1 : 0);
    const bestRacePoints = racePoints.length > 0 ? Math.max(...racePoints) : 0;

    const { data: existingLb } = await supabase
      .from("leaderboard")
      .select("id")
      .eq("user_id", userId)
      .eq("season_id", season.id)
      .single();

    const leaderboardData = {
      user_id: userId,
      season_id: season.id,
      total_points: totalPoints,
      predictions_count: predictionsCount,
      best_race_points: bestRacePoints,
      rank: 0,
    };

    if (existingLb) {
      await supabase.from("leaderboard").update(leaderboardData).eq("id", existingLb.id);
    } else {
      await supabase.from("leaderboard").insert(leaderboardData);
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
