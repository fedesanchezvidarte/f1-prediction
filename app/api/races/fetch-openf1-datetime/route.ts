import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

/**
 * Fetches the original start and end datetimes for a race event from OpenF1,
 * saves them to the database, and returns the updated values.
 *
 * Body: { raceId: number, meetingKey: number }
 *
 * OpenF1 sessions endpoint: https://openf1.org/docs/#sessions
 * Example: https://api.openf1.org/v1/sessions?meeting_key=1279&session_name=Race
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

  const { raceId, meetingKey } = body as {
    raceId: number;
    meetingKey: number;
  };

  if (!raceId || !meetingKey) {
    return NextResponse.json(
      { error: "raceId and meetingKey are required" },
      { status: 400 }
    );
  }

  // Fetch the Race session from OpenF1
  const sessionsRes = await fetch(
    `https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}&session_name=Race`
  );

  if (!sessionsRes.ok) {
    return NextResponse.json(
      { error: `OpenF1 sessions API returned ${sessionsRes.status}` },
      { status: 502 }
    );
  }

  const sessions: OpenF1Session[] = await sessionsRes.json();

  if (!sessions || sessions.length === 0) {
    return NextResponse.json(
      { error: `No Race session found for meeting key ${meetingKey}` },
      { status: 404 }
    );
  }

  const session = sessions[0];
  const dateStart = session.date_start;
  const dateEnd = session.date_end;

  if (!dateStart || !dateEnd) {
    return NextResponse.json(
      { error: "OpenF1 session is missing date_start or date_end" },
      { status: 502 }
    );
  }

  // Persist to database
  const { error } = await supabase
    .from("races")
    .update({ date_start: dateStart, date_end: dateEnd })
    .eq("id", raceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    dateStart,
    dateEnd,
    gmtOffset: session.gmt_offset,
  });
}
