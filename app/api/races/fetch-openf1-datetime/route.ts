import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

/**
 * Fetches datetimes from OpenF1 and persists them to the database:
 *   date_start → Practice 1 session start (weekend opens)
 *   date_end   → Qualifying start (regular) or Sprint Qualifying start (sprint weekends)
 *               This is the prediction submission deadline.
 *
 * Body: { raceId: number }
 *
 * OpenF1 sessions endpoint: https://openf1.org/docs/#sessions
 * Example: https://api.openf1.org/v1/sessions?circuit_short_name=Melbourne&session_name=Qualifying&year=2026
 */

interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
  date_start: string;
  date_end: string;
  gmt_offset: string;
  country_name: string;
  location: string;
  year: number;
}

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { raceId } = body as { raceId: number };

  if (!raceId) {
    return NextResponse.json({ error: "raceId is required" }, { status: 400 });
  }

  // Fetch circuit_short_name, has_sprint, and season year from DB.
  const { data: raceRecord } = await supabase
    .from("races")
    .select("circuit_short_name, country_name, has_sprint, seasons(year)")
    .eq("id", raceId)
    .single();

  if (!raceRecord) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const season = Array.isArray(raceRecord.seasons)
    ? raceRecord.seasons[0]
    : raceRecord.seasons;
  const year = season?.year;

  if (!year) {
    return NextResponse.json({ error: "Could not determine season year for this race" }, { status: 500 });
  }

  const circuit = encodeURIComponent(raceRecord.circuit_short_name);
  // Prediction deadline = start of the session that locks the grid:
  //   sprint weekends → Sprint Qualifying; regular weekends → Qualifying
  const deadlineSession = raceRecord.has_sprint ? "Sprint Qualifying" : "Qualifying";

  // Fetch Practice 1 (weekend start) and the deadline session in parallel.
  const [fp1Res, deadlineRes] = await Promise.all([
    fetch(`https://api.openf1.org/v1/sessions?circuit_short_name=${circuit}&session_name=Practice+1&year=${year}`),
    fetch(`https://api.openf1.org/v1/sessions?circuit_short_name=${circuit}&session_name=${encodeURIComponent(deadlineSession)}&year=${year}`),
  ]);

  if (!fp1Res.ok || !deadlineRes.ok) {
    return NextResponse.json(
      { error: `OpenF1 sessions API error: FP1=${fp1Res.status} ${deadlineSession}=${deadlineRes.status}` },
      { status: 502 }
    );
  }

  const [fp1Sessions, deadlineSessions]: [OpenF1Session[], OpenF1Session[]] = await Promise.all([
    fp1Res.json(),
    deadlineRes.json(),
  ]);

  if (!fp1Sessions || fp1Sessions.length === 0) {
    return NextResponse.json(
      { error: `No Practice 1 session found on OpenF1 for ${raceRecord.circuit_short_name} ${year}` },
      { status: 404 }
    );
  }

  if (!deadlineSessions || deadlineSessions.length === 0) {
    return NextResponse.json(
      { error: `No ${deadlineSession} session found on OpenF1 for ${raceRecord.circuit_short_name} ${year}` },
      { status: 404 }
    );
  }

  const dateStart = fp1Sessions[0].date_start;           // weekend opens
  const dateEnd = deadlineSessions[0].date_start;         // prediction deadline
  const gmtOffset = deadlineSessions[0].gmt_offset;

  if (!dateStart || !dateEnd) {
    return NextResponse.json(
      { error: "OpenF1 session is missing date_start" },
      { status: 502 }
    );
  }

  // Persist to database
  const { data, error } = await supabase
    .from("races")
    .update({ date_start: dateStart, date_end: dateEnd })
    .eq("id", raceId)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "No race found with that ID, or update was blocked by database policy" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    dateStart,
    dateEnd,
    gmtOffset,
  });
}
