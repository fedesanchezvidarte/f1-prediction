import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { scoreChampionForSeason } from "@/lib/scoring-service";

/**
 * Re-scores all champion predictions for the current season
 * using the existing champion_results entry.
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
    const adminDb = createAdminClient();
    const result = await scoreChampionForSeason(adminDb, season.id);

    return NextResponse.json({
      success: true,
      championPredictionsScored: result.championPredictionsScored,
      teamBestDriverPredictionsScored: result.teamBestDriverPredictionsScored,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to re-score champion predictions: ${message}` },
      { status: 500 }
    );
  }
}
