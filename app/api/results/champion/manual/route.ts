import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { scoreChampionForSeason } from "@/lib/scoring-service";

/**
 * Allows an admin to manually enter or override champion (WDC/WCC) results.
 * After saving, it automatically re-scores all champion predictions.
 *
 * Body:
 * {
 *   wdcDriverId: number,   // DB drivers.id of the WDC winner
 *   wccTeamId: number,     // DB teams.id of the WCC winner
 * }
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
    return NextResponse.json(
      { error: "Forbidden: admin access required" },
      { status: 403 }
    );
  }

  let body: { wdcDriverId?: number; wccTeamId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { wdcDriverId, wccTeamId } = body;

  if (!wdcDriverId || !wccTeamId) {
    return NextResponse.json(
      { error: "wdcDriverId and wccTeamId are required" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(wdcDriverId) || wdcDriverId <= 0) {
    return NextResponse.json(
      { error: "wdcDriverId must be a positive integer" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(wccTeamId) || wccTeamId <= 0) {
    return NextResponse.json(
      { error: "wccTeamId must be a positive integer" },
      { status: 400 }
    );
  }

  // Get current season
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) {
    return NextResponse.json({ error: "No active season found" }, { status: 404 });
  }

  // Validate driver exists
  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("id", wdcDriverId)
    .single();

  if (!driver) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  // Validate team exists
  const { data: team } = await supabase
    .from("teams")
    .select("id")
    .eq("id", wccTeamId)
    .single();

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  try {
    const resultData = {
      season_id: season.id,
      wdc_driver_id: wdcDriverId,
      wcc_team_id: wccTeamId,
      source: "manual" as const,
    };

    const { data: existing } = await supabase
      .from("champion_results")
      .select("id")
      .eq("season_id", season.id)
      .single();

    if (existing) {
      const { error } = await supabase
        .from("champion_results")
        .update(resultData)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("champion_results")
        .insert(resultData);
      if (error) throw new Error(error.message);
    }

    // Score all champion predictions for this season
    const scoring = await scoreChampionForSeason(supabase, season.id);

    return NextResponse.json({
      success: true,
      source: "manual",
      scoring,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : (error as { message?: string })?.message ?? "Unknown error";
    return NextResponse.json(
      { error: `Failed to save champion result: ${message}` },
      { status: 500 }
    );
  }
}
