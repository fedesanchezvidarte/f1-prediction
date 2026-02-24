import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreRaceForId } from "@/lib/scoring-service";
import { isAdminUser } from "@/lib/admin";

/**
 * Allows an admin to manually enter or override race/sprint results.
 * After saving, it triggers the scoring endpoint automatically.
 *
 * Body for race:
 * {
 *   raceId: number,
 *   sessionType: "race",
 *   polePositionDriverId: number,
 *   top10: number[],           // ordered [P1, ..., P10] driver IDs
 *   fastestLapDriverId: number,
 *   fastestPitStopDriverId: number,
 * }
 *
 * Body for sprint:
 * {
 *   raceId: number,
 *   sessionType: "sprint",
 *   sprintPoleDriverId: number,
 *   top8: number[],            // ordered [P1, ..., P8] driver IDs
 *   fastestLapDriverId: number,
 * }
 */

interface RaceResultBody {
  raceId: number;
  sessionType: "race";
  polePositionDriverId: number;
  top10: number[];
  fastestLapDriverId: number;
  fastestPitStopDriverId: number;
}

interface SprintResultBody {
  raceId: number;
  sessionType: "sprint";
  sprintPoleDriverId: number;
  top8: number[];
  fastestLapDriverId: number;
}

type RequestBody = RaceResultBody | SprintResultBody;

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

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { raceId, sessionType } = body;

  if (!raceId || !sessionType) {
    return NextResponse.json(
      { error: "raceId and sessionType are required" },
      { status: 400 }
    );
  }

  // Verify the race exists
  const { data: race } = await supabase
    .from("races")
    .select("id, has_sprint")
    .eq("id", raceId)
    .single();

  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  if (sessionType === "sprint" && !race.has_sprint) {
    return NextResponse.json(
      { error: "This race does not have a sprint session" },
      { status: 400 }
    );
  }

  try {
    if (sessionType === "race") {
      const {
        polePositionDriverId,
        top10,
        fastestLapDriverId,
        fastestPitStopDriverId,
      } = body as RaceResultBody;

      if (!polePositionDriverId || !top10 || top10.length !== 10 || !fastestLapDriverId || !fastestPitStopDriverId) {
        return NextResponse.json(
          {
            error:
              "Race results require: polePositionDriverId, top10 (10 driver IDs), fastestLapDriverId, fastestPitStopDriverId",
          },
          { status: 400 }
        );
      }

      // Validate all top10 entries are valid positive numbers
      if (top10.some((id) => typeof id !== "number" || id <= 0 || !Number.isFinite(id))) {
        return NextResponse.json(
          { error: "All top10 entries must be valid positive driver IDs" },
          { status: 400 }
        );
      }

      const resultData = {
        race_id: raceId,
        pole_position_driver_id: polePositionDriverId,
        top_10: top10,
        fastest_lap_driver_id: fastestLapDriverId,
        fastest_pit_stop_driver_id: fastestPitStopDriverId,
        source: "manual" as const,
      };

      const { data: existingResult } = await supabase
        .from("race_results")
        .select("id")
        .eq("race_id", raceId)
        .single();

      if (existingResult) {
        const { error } = await supabase
          .from("race_results")
          .update(resultData)
          .eq("id", existingResult.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("race_results").insert(resultData);
        if (error) throw error;
      }
    } else {
      const { sprintPoleDriverId, top8, fastestLapDriverId } =
        body as SprintResultBody;

      if (!sprintPoleDriverId || !top8 || top8.length !== 8 || !fastestLapDriverId) {
        return NextResponse.json(
          {
            error:
              "Sprint results require: sprintPoleDriverId, top8 (8 driver IDs), fastestLapDriverId",
          },
          { status: 400 }
        );
      }

      // Validate all top8 entries are valid positive numbers
      if (top8.some((id) => typeof id !== "number" || id <= 0 || !Number.isFinite(id))) {
        return NextResponse.json(
          { error: "All top8 entries must be valid positive driver IDs" },
          { status: 400 }
        );
      }

      const resultData = {
        race_id: raceId,
        sprint_pole_driver_id: sprintPoleDriverId,
        top_8: top8,
        fastest_lap_driver_id: fastestLapDriverId,
        source: "manual" as const,
      };

      const { data: existingResult } = await supabase
        .from("sprint_results")
        .select("id")
        .eq("race_id", raceId)
        .single();

      if (existingResult) {
        const { error } = await supabase
          .from("sprint_results")
          .update(resultData)
          .eq("id", existingResult.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sprint_results")
          .insert(resultData);
        if (error) throw error;
      }
    }

    // Trigger scoring directly (no internal HTTP call)
    const scoreResult = await scoreRaceForId(supabase, raceId);

    return NextResponse.json({
      success: true,
      source: "manual",
      scoring: scoreResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to save results: ${message}` },
      { status: 500 }
    );
  }
}
