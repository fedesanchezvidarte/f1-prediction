import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreRaceForId } from "@/lib/scoring-service";

/**
 * Fetches race results from the OpenF1 API and stores them in the database.
 * Then triggers scoring for all submitted predictions.
 *
 * Uses the `session_result` endpoint for final standings and `starting_grid`
 * for pole position — both give clean sorted data directly.
 *
 * Body: { meetingKey: number, sessionType: "race" | "sprint" }
 *
 * OpenF1 API docs: https://openf1.org/docs/?shell#session-result
 */

interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
}

interface OpenF1SessionResult {
  driver_number: number;
  position: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
}

interface OpenF1StartingGrid {
  driver_number: number;
  position: number;
}

interface OpenF1LapData {
  driver_number: number;
  lap_duration: number;
  is_pit_out_lap: boolean;
}

interface OpenF1PitData {
  driver_number: number;
  pit_duration: number;
  stop_duration: number | null;
}

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
  const { meetingKey, sessionType } = body as {
    meetingKey: number;
    sessionType: "race" | "sprint";
  };

  if (!meetingKey || !sessionType) {
    return NextResponse.json(
      { error: "meetingKey and sessionType are required" },
      { status: 400 }
    );
  }

  try {
    // 1. Find the race session key
    const sessionName = sessionType === "race" ? "Race" : "Sprint";
    const sessionsRes = await fetch(
      `https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}&session_name=${sessionName}`
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
        { error: `No ${sessionName} session found for meeting ${meetingKey}` },
        { status: 404 }
      );
    }

    const sessionKey = sessions[0].session_key;

    // 2. Fetch final standings via session_result (clean sorted data)
    const resultRes = await fetch(
      `https://api.openf1.org/v1/session_result?session_key=${sessionKey}`
    );
    if (!resultRes.ok) {
      return NextResponse.json(
        { error: `OpenF1 session_result API returned ${resultRes.status}` },
        { status: 502 }
      );
    }
    const sessionResults: OpenF1SessionResult[] = await resultRes.json();

    if (!sessionResults || sessionResults.length === 0) {
      return NextResponse.json(
        { error: `No results available yet for session ${sessionKey}` },
        { status: 404 }
      );
    }

    // Filter out DNF/DNS/DSQ for position ranking, then sort by position
    const classified = sessionResults
      .filter((r) => !r.dns && !r.dsq)
      .sort((a, b) => a.position - b.position);

    // 3. Get pole position from the starting grid of the race session
    const qualyName = sessionType === "race" ? "Qualifying" : "Sprint Qualifying";
    const qualyRes = await fetch(
      `https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}&session_name=${qualyName}`
    );
    let poleDriverNumber: number | null = null;
    if (qualyRes.ok) {
      const qualySessions: OpenF1Session[] = await qualyRes.json();
      if (qualySessions && qualySessions.length > 0) {
        const gridRes = await fetch(
          `https://api.openf1.org/v1/starting_grid?session_key=${qualySessions[0].session_key}&position=1`
        );
        if (gridRes.ok) {
          const grid: OpenF1StartingGrid[] = await gridRes.json();
          if (grid && grid.length > 0) {
            poleDriverNumber = grid[0].driver_number;
          }
        }
      }
    }

    // Fallback: if starting_grid didn't work, use session_result from qualifying
    if (poleDriverNumber === null && qualyRes.ok) {
      const qualySessions: OpenF1Session[] = await qualyRes.json();
      if (qualySessions && qualySessions.length > 0) {
        const qualyResultRes = await fetch(
          `https://api.openf1.org/v1/session_result?session_key=${qualySessions[0].session_key}&position=1`
        );
        if (qualyResultRes.ok) {
          const qualyResults: OpenF1SessionResult[] = await qualyResultRes.json();
          if (qualyResults && qualyResults.length > 0) {
            poleDriverNumber = qualyResults[0].driver_number;
          }
        }
      }
    }

    // 4. Get fastest lap
    const lapsRes = await fetch(
      `https://api.openf1.org/v1/laps?session_key=${sessionKey}`
    );
    let fastestLapDriver: number | null = null;
    if (lapsRes.ok) {
      const allLaps: OpenF1LapData[] = await lapsRes.json();
      let fastestLapTime = Infinity;
      for (const lap of allLaps) {
        if (
          lap.lap_duration &&
          lap.lap_duration > 0 &&
          !lap.is_pit_out_lap &&
          lap.lap_duration < fastestLapTime
        ) {
          fastestLapTime = lap.lap_duration;
          fastestLapDriver = lap.driver_number;
        }
      }
    }

    // 5. Map OpenF1 driver numbers to our DB driver IDs
    const { data: race } = await supabase
      .from("races")
      .select("id, season_id")
      .eq("meeting_key", meetingKey)
      .single();

    if (!race) {
      return NextResponse.json(
        { error: "Race not found in database" },
        { status: 404 }
      );
    }

    const { data: dbDrivers } = await supabase
      .from("drivers")
      .select("id, driver_number")
      .eq("season_id", race.season_id);

    const driverNumberToId = new Map<number, number>();
    for (const d of dbDrivers ?? []) {
      driverNumberToId.set(d.driver_number, d.id);
    }

    function mapDriverId(driverNumber: number | null): number | null {
      if (driverNumber === null) return null;
      return driverNumberToId.get(driverNumber) ?? null;
    }

    if (sessionType === "race") {
      const topN = classified.slice(0, 10);
      const top10Ids = topN.map((entry) => mapDriverId(entry.driver_number));

      // 6. Get fastest pit stop (race only) — prefer stop_duration (stationary time)
      const pitsRes = await fetch(
        `https://api.openf1.org/v1/pit?session_key=${sessionKey}`
      );
      let fastestPitDriver: number | null = null;
      if (pitsRes.ok) {
        const allPits: OpenF1PitData[] = await pitsRes.json();
        let fastestPitTime = Infinity;
        for (const pit of allPits) {
          const duration = pit.stop_duration ?? pit.pit_duration;
          if (duration && duration > 0 && duration < fastestPitTime) {
            fastestPitTime = duration;
            fastestPitDriver = pit.driver_number;
          }
        }
      }

      const resultData = {
        race_id: race.id,
        pole_position_driver_id: mapDriverId(poleDriverNumber),
        top_10: top10Ids,
        fastest_lap_driver_id: mapDriverId(fastestLapDriver),
        fastest_pit_stop_driver_id: mapDriverId(fastestPitDriver),
        source: "openf1" as const,
      };

      const { data: existingResult } = await supabase
        .from("race_results")
        .select("id")
        .eq("race_id", race.id)
        .single();

      if (existingResult) {
        await supabase
          .from("race_results")
          .update(resultData)
          .eq("id", existingResult.id);
      } else {
        await supabase.from("race_results").insert(resultData);
      }
    } else {
      const topN = classified.slice(0, 8);
      const top8Ids = topN.map((entry) => mapDriverId(entry.driver_number));

      const resultData = {
        race_id: race.id,
        sprint_pole_driver_id: mapDriverId(poleDriverNumber),
        top_8: top8Ids,
        fastest_lap_driver_id: mapDriverId(fastestLapDriver),
        source: "openf1" as const,
      };

      const { data: existingResult } = await supabase
        .from("sprint_results")
        .select("id")
        .eq("race_id", race.id)
        .single();

      if (existingResult) {
        await supabase
          .from("sprint_results")
          .update(resultData)
          .eq("id", existingResult.id);
      } else {
        await supabase.from("sprint_results").insert(resultData);
      }
    }

    // 7. Trigger scoring directly (no internal HTTP call)
    const scoreResult = await scoreRaceForId(supabase, race.id);

    return NextResponse.json({
      success: true,
      sessionKey,
      driversFound: classified.length,
      source: "openf1",
      scoring: scoreResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch from OpenF1: ${message}` },
      { status: 500 }
    );
  }
}
