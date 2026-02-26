import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { scoreRaceForId } from "@/lib/scoring-service";

/**
 * Re-scores ALL races that have results in the current season.
 * This is useful after bulk data fixes or scoring-algorithm changes.
 *
 * Before re-scoring, it reverts all "scored" predictions back to "submitted"
 * so the scoring engine can pick them up again.
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
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  try {
    // Get current season
    const { data: season } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_current", true)
      .single();

    if (!season) {
      return NextResponse.json({ error: "No active season found" }, { status: 404 });
    }

    // Get all races for the current season that have results
    const { data: races } = await supabase
      .from("races")
      .select("id")
      .eq("season_id", season.id);

    if (!races || races.length === 0) {
      return NextResponse.json({ success: true, racesScored: 0, totalRace: 0, totalSprint: 0 });
    }

    const raceIds = races.map((r) => r.id);

    // Find which races have results
    const { data: raceResults } = await supabase
      .from("race_results")
      .select("race_id")
      .in("race_id", raceIds);

    const { data: sprintResults } = await supabase
      .from("sprint_results")
      .select("race_id")
      .in("race_id", raceIds);

    const raceIdsWithResults = new Set([
      ...(raceResults ?? []).map((r) => r.race_id),
      ...(sprintResults ?? []).map((r) => r.race_id),
    ]);

    if (raceIdsWithResults.size === 0) {
      return NextResponse.json({ success: true, racesScored: 0, totalRace: 0, totalSprint: 0 });
    }

    // Revert all scored race predictions back to "submitted" for these races
    const { error: revertRaceErr } = await supabase
      .from("race_predictions")
      .update({ status: "submitted", points_earned: null })
      .in("race_id", Array.from(raceIdsWithResults))
      .eq("status", "scored");

    if (revertRaceErr) {
      return NextResponse.json(
        { error: `Failed to revert race predictions: ${revertRaceErr.message}` },
        { status: 500 }
      );
    }

    // Revert all scored sprint predictions back to "submitted" for these races
    const { error: revertSprintErr } = await supabase
      .from("sprint_predictions")
      .update({ status: "submitted", points_earned: null })
      .in("race_id", Array.from(raceIdsWithResults))
      .eq("status", "scored");

    if (revertSprintErr) {
      return NextResponse.json(
        { error: `Failed to revert sprint predictions: ${revertSprintErr.message}` },
        { status: 500 }
      );
    }

    // Re-score each race, collecting partial failures instead of aborting
    let totalRace = 0;
    let totalSprint = 0;
    const failedRaceIds: number[] = [];

    for (const raceId of raceIdsWithResults) {
      try {
        const result = await scoreRaceForId(supabase, raceId);
        totalRace += result.racePredictionsScored;
        totalSprint += result.sprintPredictionsScored;
      } catch (raceErr) {
        console.error(`[score-all] Failed to score race ${raceId}:`, raceErr);
        failedRaceIds.push(raceId);
      }
    }

    return NextResponse.json({
      success: failedRaceIds.length === 0,
      racesScored: raceIdsWithResults.size - failedRaceIds.length,
      totalRace,
      totalSprint,
      ...(failedRaceIds.length > 0 && {
        partialFailure: true,
        failedRaceIds,
        error: `Failed to score ${failedRaceIds.length} race(s). See failedRaceIds for details.`,
      }),
    });
  } catch (err) {
    console.error("[score-all] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
