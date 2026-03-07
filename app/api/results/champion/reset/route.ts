import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { updateLeaderboard } from "@/lib/scoring-service";

/**
 * Resets all season award results for the current season.
 * Deletes season_award_results, reverts all scored season_award_predictions
 * back to "submitted", and recalculates the leaderboard for affected users.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json(
      { error: "Forbidden: admin access required" },
      { status: 403 }
    );
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) {
    return NextResponse.json({ error: "No active season found" }, { status: 404 });
  }

  try {
    // Find all users whose season award predictions were already scored
    const { data: scoredPreds } = await supabase
      .from("season_award_predictions")
      .select("id, user_id")
      .eq("season_id", season.id)
      .eq("status", "scored");

    const affectedUserIds = new Set<string>();
    for (const p of scoredPreds ?? []) affectedUserIds.add(p.user_id);

    // Revert scored season award predictions back to "submitted" and clear points
    if (scoredPreds && scoredPreds.length > 0) {
      const { error: updateErr } = await supabase
        .from("season_award_predictions")
        .update({ status: "submitted", points_earned: 0 })
        .eq("season_id", season.id)
        .eq("status", "scored");

      if (updateErr) {
        return NextResponse.json(
          { error: `Failed to revert predictions: ${updateErr.message}` },
          { status: 500 }
        );
      }
    }

    // Delete all season award results
    const { error: deleteErr } = await supabase
      .from("season_award_results")
      .delete()
      .eq("season_id", season.id);

    if (deleteErr) {
      return NextResponse.json(
        { error: `Failed to delete season award results: ${deleteErr.message}` },
        { status: 500 }
      );
    }

    // Recalculate leaderboard for affected users
    if (affectedUserIds.size > 0) {
      await updateLeaderboard(supabase, [...affectedUserIds], []);
    }

    return NextResponse.json({
      success: true,
      predictionsReverted: scoredPreds?.length ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string })?.message ?? "Unknown error";
    return NextResponse.json(
      { error: `Failed to reset champion result: ${message}` },
      { status: 500 }
    );
  }
}
