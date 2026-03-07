import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getChampionPredictionPhase } from "@/lib/race-utils";
import type { Race } from "@/types";

/**
 * Saves a prediction to the database.
 * Accepts driver numbers (not DB IDs) — maps them internally.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { type } = body as { type: string };

  if (type === "race") {
    return handleRacePrediction(supabase, user.id, body as Parameters<typeof handleRacePrediction>[2]);
  }
  if (type === "sprint") {
    return handleSprintPrediction(supabase, user.id, body as Parameters<typeof handleSprintPrediction>[2]);
  }
  if (type === "champion") {
    return handleSeasonAwardPredictions(supabase, user.id, body as Parameters<typeof handleSeasonAwardPredictions>[2]);
  }

  return NextResponse.json({ error: "Invalid prediction type" }, { status: 400 });
}

async function getDriverNumberToIdMap(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return new Map<number, number>();

  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, driver_number")
    .eq("season_id", season.id);

  const map = new Map<number, number>();
  for (const d of drivers ?? []) {
    map.set(d.driver_number, d.id);
  }
  return map;
}

async function getRaceDbId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  meetingKey: number
) {
  const { data } = await supabase
    .from("races")
    .select("id")
    .eq("meeting_key", meetingKey)
    .single();
  return data?.id ?? null;
}

async function handleRacePrediction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: {
    raceId: number; // meetingKey
    polePositionDriverNumber: number | null;
    top10: (number | null)[]; // driver numbers
    fastestLapDriverNumber: number | null;
    fastestPitStopDriverNumber: number | null;
    driverOfTheDayDriverNumber: number | null;
  }
) {
  const { raceId: meetingKey, polePositionDriverNumber, top10, fastestLapDriverNumber, fastestPitStopDriverNumber, driverOfTheDayDriverNumber } = body;

  if (!Array.isArray(top10) || top10.length !== 10) {
    return NextResponse.json({ error: "top10 must be an array of exactly 10 elements" }, { status: 400 });
  }
  const nonNullTop10 = top10.filter((d): d is number => d !== null);
  if (new Set(nonNullTop10).size !== nonNullTop10.length) {
    return NextResponse.json({ error: "top10 must not contain duplicate drivers" }, { status: 400 });
  }

  const raceDbId = await getRaceDbId(supabase, meetingKey);
  if (!raceDbId) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const driverMap = await getDriverNumberToIdMap(supabase);
  function mapDriver(num: number | null): number | null {
    if (num === null) return null;
    return driverMap.get(num) ?? null;
  }

  const { data: existing } = await supabase
    .from("race_predictions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("race_id", raceDbId)
    .single();

  if (existing?.status === "scored") {
    return NextResponse.json({ error: "Cannot modify a scored prediction" }, { status: 400 });
  }

  const predictionData = {
    user_id: userId,
    race_id: raceDbId,
    pole_position_driver_id: mapDriver(polePositionDriverNumber),
    top_10: top10.map(mapDriver),
    fastest_lap_driver_id: mapDriver(fastestLapDriverNumber),
    fastest_pit_stop_driver_id: mapDriver(fastestPitStopDriverNumber),
    driver_of_the_day_driver_id: mapDriver(driverOfTheDayDriverNumber),
    status: "submitted",
    submitted_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("race_predictions")
      .update(predictionData)
      .eq("id", existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("race_predictions")
      .insert(predictionData);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function handleSprintPrediction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: {
    raceId: number; // meetingKey
    sprintPoleDriverNumber: number | null;
    top8: (number | null)[]; // driver numbers
    fastestLapDriverNumber: number | null;
  }
) {
  const { raceId: meetingKey, sprintPoleDriverNumber, top8, fastestLapDriverNumber } = body;

  if (!Array.isArray(top8) || top8.length !== 8) {
    return NextResponse.json({ error: "top8 must be an array of exactly 8 elements" }, { status: 400 });
  }
  const nonNullTop8 = top8.filter((d): d is number => d !== null);
  if (new Set(nonNullTop8).size !== nonNullTop8.length) {
    return NextResponse.json({ error: "top8 must not contain duplicate drivers" }, { status: 400 });
  }

  const raceDbId = await getRaceDbId(supabase, meetingKey);
  if (!raceDbId) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const driverMap = await getDriverNumberToIdMap(supabase);
  function mapDriver(num: number | null): number | null {
    if (num === null) return null;
    return driverMap.get(num) ?? null;
  }

  const { data: existing } = await supabase
    .from("sprint_predictions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("race_id", raceDbId)
    .single();

  if (existing?.status === "scored") {
    return NextResponse.json({ error: "Cannot modify a scored prediction" }, { status: 400 });
  }

  const predictionData = {
    user_id: userId,
    race_id: raceDbId,
    sprint_pole_driver_id: mapDriver(sprintPoleDriverNumber),
    top_8: top8.map(mapDriver),
    fastest_lap_driver_id: mapDriver(fastestLapDriverNumber),
    status: "submitted",
    submitted_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("sprint_predictions")
      .update(predictionData)
      .eq("id", existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("sprint_predictions")
      .insert(predictionData);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function handleSeasonAwardPredictions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: {
    wdcDriverNumber: number | null;
    wccTeamName: string | null;
    mostDnfsDriverNumber: number | null;
    mostPodiumsDriverNumber: number | null;
    mostWinsDriverNumber: number | null;
    teamBestDrivers?: Array<{ teamId: number; driverNumber: number }>;
  }
) {
  const { wdcDriverNumber, wccTeamName, mostDnfsDriverNumber, mostPodiumsDriverNumber, mostWinsDriverNumber, teamBestDrivers } = body;

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) {
    return NextResponse.json({ error: "No active season" }, { status: 404 });
  }

  // Fetch race calendar to enforce champion prediction deadlines
  const { data: racesRaw } = await supabase
    .from("races")
    .select("meeting_key, race_name, official_name, circuit_short_name, country_name, country_code, location, date_start, date_end, round, has_sprint")
    .eq("season_id", season.id)
    .order("round", { ascending: true });

  const races: Race[] = (racesRaw ?? []).map((r: Record<string, unknown>) => ({
    meetingKey: r.meeting_key as number,
    raceName: r.race_name as string,
    officialName: r.official_name as string,
    circuitShortName: r.circuit_short_name as string,
    countryName: r.country_name as string,
    countryCode: r.country_code as string,
    location: r.location as string,
    dateStart: r.date_start as string,
    dateEnd: r.date_end as string,
    round: r.round as number,
    hasSprint: r.has_sprint as boolean,
  }));

  const phase = getChampionPredictionPhase(races);

  if (phase === "closed") {
    return NextResponse.json(
      { error: "Champion predictions are permanently closed after the summer break" },
      { status: 403 }
    );
  }

  const isHalfPhase = phase === "half";

  // Load all award types for this season (slug → row)
  const { data: awardTypes } = await supabase
    .from("season_award_types")
    .select("id, slug, subject_type, scope_team_id, points_value")
    .eq("season_id", season.id);

  if (!awardTypes || awardTypes.length === 0) {
    return NextResponse.json({ error: "No season award types configured" }, { status: 500 });
  }

  const slugToAwardType = new Map(awardTypes.map((at) => [at.slug, at]));

  const driverMap = await getDriverNumberToIdMap(supabase);

  // Build the payload: slug → { driverId, teamId }
  const awards: Array<{ slug: string; driverId: number | null; teamId: number | null }> = [];

  // Champion categories
  if (wdcDriverNumber !== undefined) {
    awards.push({ slug: "wdc", driverId: wdcDriverNumber !== null ? (driverMap.get(wdcDriverNumber) ?? null) : null, teamId: null });
  }
  if (wccTeamName !== undefined) {
    let wccTeamId: number | null = null;
    if (wccTeamName) {
      const { data: team } = await supabase
        .from("teams")
        .select("id")
        .eq("name", wccTeamName)
        .eq("season_id", season.id)
        .single();
      wccTeamId = team?.id ?? null;
    }
    awards.push({ slug: "wcc", driverId: null, teamId: wccTeamId });
  }
  if (mostDnfsDriverNumber !== undefined) {
    awards.push({ slug: "most_dnfs", driverId: mostDnfsDriverNumber !== null ? (driverMap.get(mostDnfsDriverNumber) ?? null) : null, teamId: null });
  }
  if (mostPodiumsDriverNumber !== undefined) {
    awards.push({ slug: "most_podiums", driverId: mostPodiumsDriverNumber !== null ? (driverMap.get(mostPodiumsDriverNumber) ?? null) : null, teamId: null });
  }
  if (mostWinsDriverNumber !== undefined) {
    awards.push({ slug: "most_wins", driverId: mostWinsDriverNumber !== null ? (driverMap.get(mostWinsDriverNumber) ?? null) : null, teamId: null });
  }

  // Team best driver awards
  if (teamBestDrivers && teamBestDrivers.length > 0) {
    for (const tbdPred of teamBestDrivers) {
      const driverId = driverMap.get(tbdPred.driverNumber) ?? null;
      if (!driverId) continue;
      awards.push({ slug: `best_driver_${tbdPred.teamId}`, driverId, teamId: null });
    }
  }

  // Process each award
  for (const award of awards) {
    const awardType = slugToAwardType.get(award.slug);
    if (!awardType) continue; // Unknown slug — skip

    // Fetch existing prediction for this (user, season, award_type)
    const { data: existing } = await supabase
      .from("season_award_predictions")
      .select("id, driver_id, team_id, status, is_half_points")
      .eq("user_id", userId)
      .eq("season_id", season.id)
      .eq("award_type_id", awardType.id)
      .single();

    if (existing?.status === "scored") continue; // Cannot modify scored prediction

    const predValue = awardType.subject_type === "team" ? award.teamId : award.driverId;
    const existingValue = awardType.subject_type === "team" ? existing?.team_id : existing?.driver_id;

    if (existing) {
      // UPDATE — only mark half-points if value changed during half phase
      const isChanged = existingValue !== predValue;
      const newIsHalfPoints = isChanged && isHalfPhase ? true : existing.is_half_points;

      const { error } = await supabase
        .from("season_award_predictions")
        .update({
          driver_id: award.driverId,
          team_id: award.teamId,
          is_half_points: newIsHalfPoints,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // INSERT — new prediction
      const { error } = await supabase
        .from("season_award_predictions")
        .insert({
          user_id: userId,
          season_id: season.id,
          award_type_id: awardType.id,
          driver_id: award.driverId,
          team_id: award.teamId,
          is_half_points: isHalfPhase,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
