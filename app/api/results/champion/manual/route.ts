import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { scoreSeasonAwardsForSeason } from "@/lib/scoring-service";

/**
 * Allows an admin to manually enter or override champion (WDC/WCC) results
 * plus the new categories: most DNFs, most podiums, most wins,
 * and the per-team best driver results.
 *
 * Body:
 * {
 *   wdcDriverId: number,
 *   wccTeamId: number,
 *   mostDnfsDriverId?: number | null,
 *   mostPodiumsDriverId?: number | null,
 *   mostWinsDriverId?: number | null,
 *   teamBestDrivers?: { teamId: number; driverId: number }[],
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

  let body: {
    wdcDriverId?: number;
    wccTeamId?: number;
    mostDnfsDriverId?: number | null;
    mostPodiumsDriverId?: number | null;
    mostWinsDriverId?: number | null;
    teamBestDrivers?: { teamId: number; driverId: number | null }[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    wdcDriverId,
    wccTeamId,
    mostDnfsDriverId,
    mostPodiumsDriverId,
    mostWinsDriverId,
    teamBestDrivers,
  } = body;

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
    // Load all award types for this season (slug → row)
    const { data: awardTypes } = await supabase
      .from("season_award_types")
      .select("id, slug, subject_type, scope_team_id")
      .eq("season_id", season.id);

    if (!awardTypes || awardTypes.length === 0) {
      return NextResponse.json({ error: "No season award types configured" }, { status: 500 });
    }

    const slugToAwardType = new Map(awardTypes.map((at) => [at.slug, at]));

    // Build results: slug → { driverId, teamId }
    const resultEntries: Array<{ slug: string; driverId: number | null; teamId: number | null }> = [
      { slug: "wdc", driverId: wdcDriverId!, teamId: null },
      { slug: "wcc", driverId: null, teamId: wccTeamId! },
      { slug: "most_dnfs", driverId: mostDnfsDriverId ?? null, teamId: null },
      { slug: "most_podiums", driverId: mostPodiumsDriverId ?? null, teamId: null },
      { slug: "most_wins", driverId: mostWinsDriverId ?? null, teamId: null },
    ];

    // Team best driver results
    if (teamBestDrivers && teamBestDrivers.length > 0) {
      for (const tbd of teamBestDrivers) {
        resultEntries.push({
          slug: `best_driver_${tbd.teamId}`,
          driverId: tbd.driverId,
          teamId: null,
        });
      }
    }

    // Upsert each result into season_award_results
    for (const entry of resultEntries) {
      const awardType = slugToAwardType.get(entry.slug);
      if (!awardType) continue;

      // Skip entries with no value (cleared team best drivers)
      if (entry.driverId === null && entry.teamId === null) {
        // Delete existing result if any
        await supabase
          .from("season_award_results")
          .delete()
          .eq("season_id", season.id)
          .eq("award_type_id", awardType.id);
        continue;
      }

      const { data: existing } = await supabase
        .from("season_award_results")
        .select("id")
        .eq("season_id", season.id)
        .eq("award_type_id", awardType.id)
        .single();

      const resultData = {
        season_id: season.id,
        award_type_id: awardType.id,
        driver_id: entry.driverId,
        team_id: entry.teamId,
        source: "manual",
      };

      if (existing) {
        const { error } = await supabase
          .from("season_award_results")
          .update(resultData)
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("season_award_results")
          .insert(resultData);
        if (error) throw new Error(error.message);
      }
    }

    // Delete results for team best driver awards not included in payload
    if (teamBestDrivers) {
      const receivedTeamSlugs = new Set(teamBestDrivers.map((t) => `best_driver_${t.teamId}`));
      for (const at of awardTypes) {
        if (at.scope_team_id !== null && !receivedTeamSlugs.has(at.slug)) {
          await supabase
            .from("season_award_results")
            .delete()
            .eq("season_id", season.id)
            .eq("award_type_id", at.id);
        }
      }
    }

    // Score all season award predictions for this season
    const scoring = await scoreSeasonAwardsForSeason(supabase, season.id);

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
