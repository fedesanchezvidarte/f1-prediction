import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { scoreChampionForSeason } from "@/lib/scoring-service";

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
    const adminDb = createAdminClient();

    const resultData: Record<string, unknown> = {
      season_id: season.id,
      wdc_driver_id: wdcDriverId,
      wcc_team_id: wccTeamId,
      most_dnfs_driver_id: mostDnfsDriverId ?? null,
      most_podiums_driver_id: mostPodiumsDriverId ?? null,
      most_wins_driver_id: mostWinsDriverId ?? null,
      source: "manual",
    };

    const { data: existing } = await adminDb
      .from("champion_results")
      .select("id")
      .eq("season_id", season.id)
      .single();

    if (existing) {
      const { error } = await adminDb
        .from("champion_results")
        .update(resultData)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await adminDb
        .from("champion_results")
        .insert(resultData);
      if (error) throw new Error(error.message);
    }

    // Upsert / delete team best driver results
    if (teamBestDrivers && teamBestDrivers.length > 0) {
      const receivedTeamIds = new Set<number>();

      for (const tbd of teamBestDrivers) {
        receivedTeamIds.add(tbd.teamId);

        if (tbd.driverId === null) {
          // Admin explicitly cleared this team — delete existing result
          await adminDb
            .from("team_best_driver_results")
            .delete()
            .eq("season_id", season.id)
            .eq("team_id", tbd.teamId);
          continue;
        }

        const { data: existingTbd } = await adminDb
          .from("team_best_driver_results")
          .select("id")
          .eq("season_id", season.id)
          .eq("team_id", tbd.teamId)
          .single();

        if (existingTbd) {
          const { error } = await adminDb
            .from("team_best_driver_results")
            .update({ driver_id: tbd.driverId })
            .eq("id", existingTbd.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await adminDb
            .from("team_best_driver_results")
            .insert({
              season_id: season.id,
              team_id: tbd.teamId,
              driver_id: tbd.driverId,
            });
          if (error) throw new Error(error.message);
        }
      }

      // Delete results for teams not included in the payload at all
      const { data: allExistingTbd } = await adminDb
        .from("team_best_driver_results")
        .select("team_id")
        .eq("season_id", season.id);

      if (allExistingTbd) {
        for (const row of allExistingTbd) {
          if (!receivedTeamIds.has(row.team_id)) {
            await adminDb
              .from("team_best_driver_results")
              .delete()
              .eq("season_id", season.id)
              .eq("team_id", row.team_id);
          }
        }
      }
    }

    // Score all champion predictions for this season
    const scoring = await scoreChampionForSeason(adminDb, season.id);

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
