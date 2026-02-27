import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RacePredictionContent } from "@/components/predictions/RacePredictionContent";
import { fetchRacesFromDb } from "@/lib/races";
import { fetchDriversFromDb } from "@/lib/drivers";
import { fetchTeamsFromDb } from "@/lib/teams";
import type {
  FullRacePrediction,
  SprintPrediction,
  ChampionPrediction,
  RaceResult,
  SprintResult,
  Driver,
} from "@/types";

interface PageProps {
  searchParams: Promise<{ user?: string; round?: string }>;
}

export default async function RacePredictionPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const viewingUserId = params.user ?? user.id;
  const roundParam = params.round ? parseInt(params.round, 10) : null;
  const isOwner = viewingUserId === user.id;

  const fallbackName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Driver";
  const fallbackAvatar = user.user_metadata?.avatar_url;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName = profileRow?.display_name ?? fallbackName;
  const avatarUrl = profileRow?.avatar_url ?? fallbackAvatar;

  // If viewing another user, fetch their display name
  let viewingDisplayName = displayName;
  if (!isOwner) {
    const { data: viewingProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", viewingUserId)
      .single();
    viewingDisplayName = viewingProfile?.display_name ?? "Driver";
  }

  // Fetch current season dynamically
  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  const seasonId = currentSeason?.id;
  if (!seasonId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted">No active season found.</p>
      </div>
    );
  }

  // Build mapping: DB driver ID -> driver number (for converting DB data to frontend)
  const { data: dbDrivers } = await supabase
    .from("drivers")
    .select("id, driver_number")
    .eq("season_id", seasonId);

  const driverIdToNumber = new Map<number, number>();
  for (const d of dbDrivers ?? []) {
    driverIdToNumber.set(d.id, d.driver_number);
  }

  // Build mapping: DB race ID -> meeting key
  const { data: dbRaces } = await supabase
    .from("races")
    .select("id, meeting_key")
    .eq("season_id", seasonId);

  const raceIdToMeetingKey = new Map<number, number>();
  for (const r of dbRaces ?? []) {
    raceIdToMeetingKey.set(r.id, r.meeting_key);
  }

  // Fetch races with live DB datetimes
  const RACES = await fetchRacesFromDb();

  if (!RACES || RACES.length === 0) {
    return (
      <>
        <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} isAdmin={isAdminUser(user)} />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold">No races available</h1>
          <p className="mt-4 text-muted-foreground">
            There are currently no races available for predictions.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  // Fetch drivers and teams from DB
  const allDrivers = await fetchDriversFromDb();
  const allTeams = await fetchTeamsFromDb();

  function findDriver(dbDriverId: number | null): Driver | null {
    if (!dbDriverId) return null;
    const driverNumber = driverIdToNumber.get(dbDriverId);
    if (driverNumber === undefined) return null;
    return allDrivers.find((d) => d.driverNumber === driverNumber) ?? null;
  }

  // Fetch race predictions for the target user
  const { data: racePredRows } = await supabase
    .from("race_predictions")
    .select("race_id, status, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, points_earned")
    .eq("user_id", viewingUserId);

  const racePredByMeetingKey = new Map<number, (typeof racePredRows extends (infer T)[] | null ? T : never)>();
  for (const row of racePredRows ?? []) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey !== undefined) {
      racePredByMeetingKey.set(meetingKey, row);
    }
  }

  const predictions: FullRacePrediction[] = RACES.map((race) => {
    const row = racePredByMeetingKey.get(race.meetingKey);
    const top10Ids: (number | null)[] = row?.top_10 ?? [];
    return {
      raceId: race.meetingKey,
      userId: viewingUserId,
      status: row?.status ?? "pending",
      polePosition: findDriver(row?.pole_position_driver_id ?? null),
      raceWinner: findDriver(top10Ids[0] ?? null),
      restOfTop10: Array.from({ length: 9 }, (_, i) => findDriver(top10Ids[i + 1] ?? null)),
      fastestLap: findDriver(row?.fastest_lap_driver_id ?? null),
      fastestPitStop: findDriver(row?.fastest_pit_stop_driver_id ?? null),
      pointsEarned: row?.points_earned ?? null,
    };
  });

  // Fetch sprint predictions
  const { data: sprintPredRows } = await supabase
    .from("sprint_predictions")
    .select("race_id, status, sprint_pole_driver_id, top_8, fastest_lap_driver_id, points_earned")
    .eq("user_id", viewingUserId);

  const sprintPredByMeetingKey = new Map<number, (typeof sprintPredRows extends (infer T)[] | null ? T : never)>();
  for (const row of sprintPredRows ?? []) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey !== undefined) {
      sprintPredByMeetingKey.set(meetingKey, row);
    }
  }

  const sprintRaces = RACES.filter((r) => r.hasSprint);
  const sprintPredictions: SprintPrediction[] = sprintRaces.map((race) => {
    const row = sprintPredByMeetingKey.get(race.meetingKey);
    const top8Ids: (number | null)[] = row?.top_8 ?? [];
    return {
      raceId: race.meetingKey,
      userId: viewingUserId,
      status: row?.status ?? "pending",
      sprintPole: findDriver(row?.sprint_pole_driver_id ?? null),
      sprintWinner: findDriver(top8Ids[0] ?? null),
      restOfTop8: Array.from({ length: 7 }, (_, i) => findDriver(top8Ids[i + 1] ?? null)),
      fastestLap: findDriver(row?.fastest_lap_driver_id ?? null),
      pointsEarned: row?.points_earned ?? null,
    };
  });

  // Fetch champion prediction
  const { data: champRow } = await supabase
    .from("champion_predictions")
    .select("status, wdc_driver_id, wcc_team_id, points_earned, is_half_points")
    .eq("user_id", viewingUserId)
    .single();

  let wccTeamName: string | null = null;
  if (champRow?.wcc_team_id) {
    const { data: teamRow } = await supabase
      .from("teams")
      .select("name")
      .eq("id", champRow.wcc_team_id)
      .single();
    wccTeamName = teamRow?.name ?? null;
  }

  const championPrediction: ChampionPrediction = {
    userId: viewingUserId,
    status: champRow?.status ?? "pending",
    wdcWinner: findDriver(champRow?.wdc_driver_id ?? null),
    wccWinner: wccTeamName,
    pointsEarned: champRow?.points_earned ?? null,
    isHalfPoints: champRow?.is_half_points ?? false,
  };

  // Fetch race results (same for all users)
  const { data: raceResultRows } = await supabase
    .from("race_results")
    .select("race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id");

  const raceResults: Record<number, RaceResult> = {};
  for (const row of raceResultRows ?? []) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey === undefined) continue;

    const top10Ids: number[] = row.top_10 ?? [];
    const top10 = top10Ids.map((id) => findDriver(id)).filter((d): d is Driver => d !== null);
    const pole = findDriver(row.pole_position_driver_id);
    const fastestLap = findDriver(row.fastest_lap_driver_id);
    const fastestPit = findDriver(row.fastest_pit_stop_driver_id);
    if (top10.length > 0 && pole && fastestLap) {
      raceResults[meetingKey] = {
        raceId: meetingKey,
        polePosition: pole,
        raceWinner: top10[0],
        top10,
        fastestLap,
        ...(fastestPit ? { fastestPitStop: fastestPit } : {}),
      };
    }
  }

  const { data: sprintResultRows } = await supabase
    .from("sprint_results")
    .select("race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id");

  const sprintResults: Record<number, SprintResult> = {};
  for (const row of sprintResultRows ?? []) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey === undefined) continue;

    const top8Ids: number[] = row.top_8 ?? [];
    const top8 = top8Ids.map((id) => findDriver(id)).filter((d): d is Driver => d !== null);
    const pole = findDriver(row.sprint_pole_driver_id);
    const fastestLap = findDriver(row.fastest_lap_driver_id);
    if (top8.length > 0 && pole && fastestLap) {
      sprintResults[meetingKey] = {
        raceId: meetingKey,
        sprintPole: pole,
        sprintWinner: top8[0],
        top8,
        fastestLap,
      };
    }
  }

  // Determine initial race index: use round param if provided, otherwise next upcoming race
  const now = new Date();
  let initialRaceIndex = 0;
  if (roundParam !== null) {
    const roundIndex = RACES.findIndex((r) => r.round === roundParam);
    if (roundIndex !== -1) initialRaceIndex = roundIndex;
  } else {
    for (let i = 0; i < RACES.length; i++) {
      if (new Date(RACES[i].dateEnd) > now) {
        initialRaceIndex = i;
        break;
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} isAdmin={isAdminUser(user)} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <RacePredictionContent
            races={RACES}
            drivers={allDrivers}
            teams={allTeams}
            predictions={predictions}
            sprintPredictions={sprintPredictions}
            championPrediction={championPrediction}
            raceResults={raceResults}
            sprintResults={sprintResults}
            isOwner={isOwner}
            displayName={viewingDisplayName}
            initialRaceIndex={initialRaceIndex}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
