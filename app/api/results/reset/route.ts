import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { updateLeaderboard } from "@/lib/scoring-service";

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
        await updateLeaderboard(supabase, [...new Set(affectedUserIds)], []);
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
        await updateLeaderboard(supabase, [...new Set(affectedUserIds)], []);
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


