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

  const { raceId, dateStart, dateEnd } = body as {
    raceId: number;
    dateStart: string;
    dateEnd: string;
  };

  if (!raceId || !dateStart || !dateEnd) {
    return NextResponse.json(
      { error: "raceId, dateStart, and dateEnd are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("races")
    .update({ date_start: dateStart, date_end: dateEnd })
    .eq("id", raceId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
