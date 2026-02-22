import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Fetches race results from the OpenF1 API and stores them in the database.
 * Then triggers scoring for all submitted predictions.
 *
 * Query params: ?meetingKey=1280&sessionType=race
 * sessionType: "race" | "sprint"
 *
 * OpenF1 API docs: https://openf1.org/docs/?shell#session-result
 */

interface OpenF1Session {
  session_key: number;
  session_name: string;
  session_type: string;
  meeting_key: number;
}

interface OpenF1Position {
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
    // 1. Find the session key for this meeting + session type
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

    // 2. Fetch position data from the session
    const positionsRes = await fetch(
      `https://api.openf1.org/v1/position?session_key=${sessionKey}`
    );
    if (!positionsRes.ok) {
      return NextResponse.json(
        { error: `OpenF1 position API returned ${positionsRes.status}` },
        { status: 502 }
      );
    }
    const allPositions: OpenF1Position[] = await positionsRes.json();

    // Get the final positions (last entry per driver)
    const finalPositions = new Map<number, number>();
    for (const pos of allPositions) {
      finalPositions.set(pos.driver_number, pos.position);
    }

    // Sort by position to get top N
    const sorted = Array.from(finalPositions.entries()).sort(
      (a, b) => a[1] - b[1]
    );

    // 3. Get qualifying session for pole position
    const qualyName = sessionType === "race" ? "Qualifying" : "Sprint Qualifying";
    const qualyRes = await fetch(
      `https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}&session_name=${qualyName}`
    );
    if (!qualyRes.ok) {
      return NextResponse.json(
        { error: `OpenF1 qualifying sessions API returned ${qualyRes.status}` },
        { status: 502 }
      );
    }
    const qualySessions: OpenF1Session[] = await qualyRes.json();

    let poleDriverNumber: number | null = null;
    if (qualySessions && qualySessions.length > 0) {
      const qualyPositionsRes = await fetch(
        `https://api.openf1.org/v1/position?session_key=${qualySessions[0].session_key}`
      );
      if (!qualyPositionsRes.ok) {
        return NextResponse.json(
          { error: `OpenF1 qualifying position API returned ${qualyPositionsRes.status}` },
          { status: 502 }
        );
      }
      const qualyPositions: OpenF1Position[] = await qualyPositionsRes.json();

      const qualyFinal = new Map<number, number>();
      for (const pos of qualyPositions) {
        qualyFinal.set(pos.driver_number, pos.position);
      }
      const qualySorted = Array.from(qualyFinal.entries()).sort(
        (a, b) => a[1] - b[1]
      );
      if (qualySorted.length > 0) {
        poleDriverNumber = qualySorted[0][0];
      }
    }

    // 4. Get fastest lap
    const lapsRes = await fetch(
      `https://api.openf1.org/v1/laps?session_key=${sessionKey}`
    );
    if (!lapsRes.ok) {
      return NextResponse.json(
        { error: `OpenF1 laps API returned ${lapsRes.status}` },
        { status: 502 }
      );
    }
    const allLaps: OpenF1LapData[] = await lapsRes.json();

    let fastestLapDriver: number | null = null;
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
      const topN = sorted.slice(0, 10);
      const top10Ids = topN.map((entry) => mapDriverId(entry[0]));

      // 6. Get fastest pit stop (race only)
      const pitsRes = await fetch(
        `https://api.openf1.org/v1/pit?session_key=${sessionKey}`
      );
      if (!pitsRes.ok) {
        return NextResponse.json(
          { error: `OpenF1 pit API returned ${pitsRes.status}` },
          { status: 502 }
        );
      }
      const allPits: OpenF1PitData[] = await pitsRes.json();

      let fastestPitDriver: number | null = null;
      let fastestPitTime = Infinity;
      for (const pit of allPits) {
        if (pit.pit_duration && pit.pit_duration > 0 && pit.pit_duration < fastestPitTime) {
          fastestPitTime = pit.pit_duration;
          fastestPitDriver = pit.driver_number;
        }
      }

      const resultData = {
        race_id: race.id,
        pole_position_driver_id: mapDriverId(poleDriverNumber),
        top_10: top10Ids,
        fastest_lap_driver_id: mapDriverId(fastestLapDriver),
        fastest_pit_stop_driver_id: mapDriverId(fastestPitDriver),
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
      const topN = sorted.slice(0, 8);
      const top8Ids = topN.map((entry) => mapDriverId(entry[0]));

      const resultData = {
        race_id: race.id,
        sprint_pole_driver_id: mapDriverId(poleDriverNumber),
        top_8: top8Ids,
        fastest_lap_driver_id: mapDriverId(fastestLapDriver),
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

    // 7. Trigger scoring
    const scoreRes = await fetch(new URL("/api/results/score", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ raceId: race.id }),
    });

    const scoreResult = await scoreRes.json();

    return NextResponse.json({
      success: true,
      sessionKey,
      driversFound: sorted.length,
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
