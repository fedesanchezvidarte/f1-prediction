import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RacePredictionContent } from "@/components/predictions/RacePredictionContent";
import { fetchRacesFromDb } from "@/lib/races";
import { fetchDriversFromDb } from "@/lib/drivers";
import { fetchTeamsFromDb, fetchTeamsWithDrivers } from "@/lib/teams";
import type {
  FullRacePrediction,
  SprintPrediction,
  ChampionPrediction,
  RaceResult,
  SprintResult,
  Driver,
  TeamBestDriverPrediction,
  SeasonAwardPrediction,
} from "@/types";

interface PageProps {
  searchParams: Promise<{ user?: string; round?: string; tab?: string }>;
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
  const tabParam = params.tab === "champion" ? "champion" as const : undefined;
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
  const teamsWithDrivers = await fetchTeamsWithDrivers();

  function findDriver(dbDriverId: number | null): Driver | null {
    if (!dbDriverId) return null;
    const driverNumber = driverIdToNumber.get(dbDriverId);
    if (driverNumber === undefined) return null;
    return allDrivers.find((d) => d.driverNumber === driverNumber) ?? null;
  }

  // Fetch race predictions for the target user
  const { data: racePredRows } = await supabase
    .from("race_predictions")
    .select("race_id, status, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, driver_of_the_day_driver_id, points_earned")
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
      driverOfTheDay: findDriver(row?.driver_of_the_day_driver_id ?? null),
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

  // Fetch season award predictions (unified champion + team best driver)
  const { data: seasonAwardRows } = await supabase
    .from("season_award_predictions")
    .select("id, award_type_id, driver_id, team_id, is_half_points, status, points_earned, season_award_types(slug, name, subject_type, scope_team_id, points_value, sort_order)")
    .eq("user_id", viewingUserId)
    .eq("season_id", seasonId);

  const seasonAwardPredictions: SeasonAwardPrediction[] = (seasonAwardRows ?? []).map((row) => {
    const rawAwardType = row.season_award_types;
    const awardType = (Array.isArray(rawAwardType) ? rawAwardType[0] : rawAwardType) as { slug: string; name: string; subject_type: string; scope_team_id: number | null; points_value: number; sort_order: number } | null;
    return {
      id: row.id,
      awardTypeId: row.award_type_id,
      slug: awardType?.slug ?? "",
      name: awardType?.name ?? "",
      subjectType: (awardType?.subject_type ?? "driver") as "driver" | "team",
      scopeTeamId: awardType?.scope_team_id ?? null,
      pointsValue: awardType?.points_value ?? 0,
      driverId: row.driver_id,
      teamId: row.team_id,
      isHalfPoints: row.is_half_points ?? false,
      status: row.status ?? "pending",
      pointsEarned: row.points_earned ?? 0,
    };
  });

  // Build legacy ChampionPrediction from season award data
  const awardBySlug = new Map(seasonAwardPredictions.map((p) => [p.slug, p]));
  const wdcAward = awardBySlug.get("wdc");
  const wccAward = awardBySlug.get("wcc");
  const mostDnfsAward = awardBySlug.get("most_dnfs");
  const mostPodiumsAward = awardBySlug.get("most_podiums");
  const mostWinsAward = awardBySlug.get("most_wins");

  let wccTeamName: string | null = null;
  if (wccAward?.teamId) {
    const { data: teamRow } = await supabase
      .from("teams")
      .select("name")
      .eq("id", wccAward.teamId)
      .single();
    wccTeamName = teamRow?.name ?? null;
  }

  // Determine overall champion status from individual awards
  const championAwards = [wdcAward, wccAward, mostDnfsAward, mostPodiumsAward, mostWinsAward];
  const hasAnyChampionSubmitted = championAwards.some((a) => a?.status === "submitted" || a?.status === "scored");
  const hasAnyChampionScored = championAwards.some((a) => a?.status === "scored");
  const anyHalfPoints = championAwards.some((a) => a?.isHalfPoints);

  const championPrediction: ChampionPrediction = {
    userId: viewingUserId,
    status: hasAnyChampionScored ? "scored" : hasAnyChampionSubmitted ? "submitted" : "pending",
    wdcWinner: findDriver(wdcAward?.driverId ?? null),
    wccWinner: wccTeamName,
    mostDnfsDriver: findDriver(mostDnfsAward?.driverId ?? null),
    mostPodiumsDriver: findDriver(mostPodiumsAward?.driverId ?? null),
    mostWinsDriver: findDriver(mostWinsAward?.driverId ?? null),
    pointsEarned: championAwards.reduce((sum, a) => sum + (a?.pointsEarned ?? 0), 0),
    wdcPoints: wdcAward?.pointsEarned ?? 0,
    wccPoints: wccAward?.pointsEarned ?? 0,
    mostDnfsPoints: mostDnfsAward?.pointsEarned ?? 0,
    mostPodiumsPoints: mostPodiumsAward?.pointsEarned ?? 0,
    mostWinsPoints: mostWinsAward?.pointsEarned ?? 0,
    isHalfPoints: anyHalfPoints,
  };

  // Build legacy TeamBestDriverPrediction[] from season award data
  const teamBestDriverPredictions: TeamBestDriverPrediction[] = teamsWithDrivers.map((team) => {
    const award = awardBySlug.get(`best_driver_${team.id}`);
    const driverId = award?.driverId ?? null;
    const matchedDriver = driverId ? team.drivers.find((d) => d.id === driverId) : null;
    return {
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
      driverId,
      driverNumber: matchedDriver?.driverNumber ?? null,
      isHalfPoints: award?.isHalfPoints ?? false,
      status: award?.status ?? "pending",
      pointsEarned: award?.pointsEarned ?? 0,
    };
  });

  // Fetch race results (same for all users)
  const { data: raceResultRows } = await supabase
    .from("race_results")
    .select("race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, driver_of_the_day_driver_id");

  const raceResults: Record<number, RaceResult> = {};
  for (const row of raceResultRows ?? []) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey === undefined) continue;

    const top10Ids: number[] = row.top_10 ?? [];
    const top10 = top10Ids.map((id) => findDriver(id)).filter((d): d is Driver => d !== null);
    const pole = findDriver(row.pole_position_driver_id);
    const fastestLap = findDriver(row.fastest_lap_driver_id);
    const fastestPit = findDriver(row.fastest_pit_stop_driver_id);
    const driverOfTheDay = findDriver(row.driver_of_the_day_driver_id);
    if (top10.length > 0 && pole && fastestLap) {
      raceResults[meetingKey] = {
        raceId: meetingKey,
        polePosition: pole,
        raceWinner: top10[0],
        top10,
        fastestLap,
        ...(fastestPit ? { fastestPitStop: fastestPit } : {}),
        ...(driverOfTheDay ? { driverOfTheDay } : {}),
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
            teamsWithDrivers={teamsWithDrivers}
            predictions={predictions}
            sprintPredictions={sprintPredictions}
            championPrediction={championPrediction}
            teamBestDriverPredictions={teamBestDriverPredictions}
            raceResults={raceResults}
            sprintResults={sprintResults}
            isOwner={isOwner}
            displayName={viewingDisplayName}
            initialRaceIndex={initialRaceIndex}
            initialTab={tabParam}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
