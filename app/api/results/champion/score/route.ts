import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { scoreSeasonAwardsForSeason } from "@/lib/scoring-service";

/**
 * Re-scores all season award predictions for the current season
 * using the existing season_award_results entries.
 *
 * Body: (none required)
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
    const result = await scoreSeasonAwardsForSeason(supabase, season.id);

    return NextResponse.json({
      success: true,
      seasonAwardPredictionsScored: result.seasonAwardPredictionsScored,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to re-score season award predictions: ${message}` },
      { status: 500 }
    );
  }
}
