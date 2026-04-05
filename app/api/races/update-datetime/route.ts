import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

/**
 * Updates the start and/or end datetime for a race event.
 *
 * Body: { raceId: number, dateStart: string, dateEnd: string }
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
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { raceId, dateStart, dateEnd, sprintDateEnd } = body as {
    raceId: number;
    dateStart: string;
    dateEnd: string;
    sprintDateEnd?: string | null;
  };

  if (!raceId || !dateStart || !dateEnd) {
    return NextResponse.json(
      { error: "raceId, dateStart, and dateEnd are required" },
      { status: 400 }
    );
  }

  const parsedStart = new Date(dateStart);
  const parsedEnd = new Date(dateEnd);

  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
    return NextResponse.json(
      { error: "dateStart and dateEnd must be valid date-time strings" },
      { status: 400 }
    );
  }

  if (parsedEnd <= parsedStart) {
    return NextResponse.json(
      { error: "dateEnd must be after dateStart" },
      { status: 400 }
    );
  }

  if (sprintDateEnd) {
    const parsedSprintEnd = new Date(sprintDateEnd);
    if (Number.isNaN(parsedSprintEnd.getTime())) {
      return NextResponse.json(
        { error: "sprintDateEnd must be a valid date-time string" },
        { status: 400 }
      );
    }
    if (parsedSprintEnd <= parsedStart) {
      return NextResponse.json(
        { error: "sprintDateEnd must be after dateStart" },
        { status: 400 }
      );
    }
    if (parsedSprintEnd >= parsedEnd) {
      return NextResponse.json(
        { error: "sprintDateEnd must be before dateEnd" },
        { status: 400 }
      );
    }
  }

  const updateData: Record<string, string | null> = {
    date_start: dateStart,
    date_end: dateEnd,
  };
  if (sprintDateEnd !== undefined) {
    updateData.sprint_date_end = sprintDateEnd ?? null;
  }

  const { data, error } = await supabase
    .from("races")
    .update(updateData)
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

  return NextResponse.json({ success: true });
}
