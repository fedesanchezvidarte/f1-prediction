import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return handleChampionPrediction(supabase, user.id, body as Parameters<typeof handleChampionPrediction>[2]);
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

async function handleChampionPrediction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  body: {
    wdcDriverNumber: number | null;
    wccTeamName: string | null;
    mostDnfsDriverNumber: number | null;
    mostPodiumsDriverNumber: number | null;
    mostWinsDriverNumber: number | null;
    isHalfPoints: boolean;
    teamBestDrivers?: Array<{ teamId: number; driverNumber: number }>;
  }
) {
  const { wdcDriverNumber, wccTeamName, mostDnfsDriverNumber, mostPodiumsDriverNumber, mostWinsDriverNumber, isHalfPoints, teamBestDrivers } = body;

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) {
    return NextResponse.json({ error: "No active season" }, { status: 404 });
  }

  const driverMap = await getDriverNumberToIdMap(supabase);
  const wdcDriverId = wdcDriverNumber !== null ? (driverMap.get(wdcDriverNumber) ?? null) : null;
  const mostDnfsDriverId = mostDnfsDriverNumber !== null ? (driverMap.get(mostDnfsDriverNumber) ?? null) : null;
  const mostPodiumsDriverId = mostPodiumsDriverNumber !== null ? (driverMap.get(mostPodiumsDriverNumber) ?? null) : null;
  const mostWinsDriverId = mostWinsDriverNumber !== null ? (driverMap.get(mostWinsDriverNumber) ?? null) : null;

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

  const { data: existing } = await supabase
    .from("champion_predictions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .single();

  if (existing?.status === "scored") {
    return NextResponse.json({ error: "Cannot modify a scored prediction" }, { status: 400 });
  }

  const predictionData = {
    user_id: userId,
    season_id: season.id,
    wdc_driver_id: wdcDriverId,
    wcc_team_id: wccTeamId,
    most_dnfs_driver_id: mostDnfsDriverId,
    most_podiums_driver_id: mostPodiumsDriverId,
    most_wins_driver_id: mostWinsDriverId,
    status: "submitted",
    is_half_points: isHalfPoints,
    submitted_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("champion_predictions")
      .update(predictionData)
      .eq("id", existing.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("champion_predictions")
      .insert(predictionData);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Handle team best driver predictions
  if (teamBestDrivers && teamBestDrivers.length > 0) {
    for (const tbdPred of teamBestDrivers) {
      const driverId = driverMap.get(tbdPred.driverNumber) ?? null;
      if (!driverId) continue;

      const { data: existingTbd } = await supabase
        .from("team_best_driver_predictions")
        .select("id, driver_id, status, is_half_points")
        .eq("user_id", userId)
        .eq("season_id", season.id)
        .eq("team_id", tbdPred.teamId)
        .single();

      if (existingTbd?.status === "scored") continue;

      const isChanged = existingTbd && existingTbd.driver_id !== driverId;

      const tbdData = {
        user_id: userId,
        season_id: season.id,
        team_id: tbdPred.teamId,
        driver_id: driverId,
        is_half_points: isHalfPoints,
        status: "submitted" as const,
        submitted_at: new Date().toISOString(),
      };

      if (existingTbd) {
        const { error } = await supabase
          .from("team_best_driver_predictions")
          .update({
            driver_id: driverId,
            is_half_points: isChanged ? true : existingTbd.is_half_points,
            status: "submitted",
            submitted_at: new Date().toISOString(),
          })
          .eq("id", existingTbd.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabase
          .from("team_best_driver_predictions")
          .insert(tbdData);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ success: true });
}
