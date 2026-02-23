import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreRaceForId } from "@/lib/scoring-service";

/**
 * Scores all submitted predictions for a given race (and sprint if applicable).
 * This should be called after race results are inserted/updated in the database.
 *
 * Body: { raceId: number } — this is the DB races.id, NOT meeting_key
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin =
    (user.app_metadata?.role === "admin") ||
    (process.env.ADMIN_USER_IDS?.split(",").includes(user.id));

  if (!isAdmin) {
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

  const result = await scoreRaceForId(supabase, raceId);

  return NextResponse.json({
    success: true,
    racePredictionsScored: result.racePredictionsScored,
    sprintPredictionsScored: result.sprintPredictionsScored,
  });
}
