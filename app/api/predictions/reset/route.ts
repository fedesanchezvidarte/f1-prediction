import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return handleRaceReset(supabase, user.id, (body as { raceId: number }).raceId);
  }
  if (type === "sprint") {
    return handleSprintReset(supabase, user.id, (body as { raceId: number }).raceId);
  }
  if (type === "champion") {
    return handleChampionReset(supabase, user.id);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
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

async function handleRaceReset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  meetingKey: number
) {
  const raceDbId = await getRaceDbId(supabase, meetingKey);
  if (!raceDbId) return NextResponse.json({ success: true });

  const { data: existing } = await supabase
    .from("race_predictions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("race_id", raceDbId)
    .single();

  if (!existing) {
    return NextResponse.json({ success: true });
  }

  if (existing.status === "scored") {
    return NextResponse.json({ error: "Cannot reset a scored prediction" }, { status: 400 });
  }

  const { error } = await supabase
    .from("race_predictions")
    .update({
      pole_position_driver_id: null,
      top_10: [],
      fastest_lap_driver_id: null,
      fastest_pit_stop_driver_id: null,
      driver_of_the_day_driver_id: null,
      status: "pending",
      submitted_at: null,
    })
    .eq("id", existing.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

async function handleSprintReset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  meetingKey: number
) {
  const raceDbId = await getRaceDbId(supabase, meetingKey);
  if (!raceDbId) return NextResponse.json({ success: true });

  const { data: existing } = await supabase
    .from("sprint_predictions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("race_id", raceDbId)
    .single();

  if (!existing) {
    return NextResponse.json({ success: true });
  }

  if (existing.status === "scored") {
    return NextResponse.json({ error: "Cannot reset a scored prediction" }, { status: 400 });
  }

  const { error } = await supabase
    .from("sprint_predictions")
    .update({
      sprint_pole_driver_id: null,
      top_8: [],
      fastest_lap_driver_id: null,
      status: "pending",
      submitted_at: null,
    })
    .eq("id", existing.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

async function handleChampionReset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return NextResponse.json({ success: true });

  const { data: existing } = await supabase
    .from("champion_predictions")
    .select("id, status")
    .eq("user_id", userId)
    .eq("season_id", season.id)
    .single();

  if (!existing) {
    return NextResponse.json({ success: true });
  }

  if (existing.status === "scored") {
    return NextResponse.json({ error: "Cannot reset a scored prediction" }, { status: 400 });
  }

  const { error } = await supabase
    .from("champion_predictions")
    .update({
      wdc_driver_id: null,
      wcc_team_id: null,
      status: "pending",
      is_half_points: false,
      submitted_at: null,
    })
    .eq("id", existing.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
