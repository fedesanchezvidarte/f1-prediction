import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@f1/shared/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RacePredictionContent } from "@/components/predictions/RacePredictionContent";
import { fetchRacesFromDb } from "@/lib/races";
import { fetchTeamsFromDb, fetchTeamsWithDrivers } from "@/lib/teams";
import { fetchRaceLineupsFromDb } from "@/lib/lineup";
import type { RaceLineupEntry } from "@f1/shared/types";
import {
  createPredictionContext,
  fetchUserRacePredictions,
  fetchUserSprintPredictions,
} from "@f1/shared/lib/predictions";
import { fetchChampionPredictionData } from "@f1/shared/lib/champion-predictions";
import { fetchRaceResults, fetchSprintResults } from "@f1/shared/lib/results";

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
  type TabMode = "race" | "sprint" | "champion";
  const tabParam: TabMode | undefined =
    params.tab === "champion" || params.tab === "sprint" || params.tab === "race"
      ? params.tab
      : undefined;
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

  // Season-scoped lookup context (current season + driver/race id mappings),
  // shared by every prediction/result fetcher below so the mappings are only
  // queried once.
  const predictionContext = await createPredictionContext(supabase);
  if (!predictionContext) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">No active season found.</p>
      </div>
    );
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

  // Determine initial race index: use round param if provided, otherwise next
  // upcoming race.
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

  // Per-race lineup overrides for EVERY round, keyed by meeting key. A driver
  // can be benched for a weekend (unselectable in every picker) and/or racing
  // for a different team that weekend (badge shows the team they actually drive
  // for). All rounds are sent because the round switcher is client-side state
  // and never returns to the server — fetching only the initially viewed round
  // would leave its overrides applied after arrowing to a different one.
  //
  // The shared fetcher keys on `races.id`; the UI keys on `meetingKey`, so
  // re-key using the context's id -> meetingKey map.
  // Degrade rather than 500 the whole page if the overrides cannot be read:
  // the pickers fall back to the season grid, and the server-side guard in
  // /api/predictions/submit still refuses a benched driver, so a bad pick
  // cannot be saved even while this page is showing stale availability.
  let lineupsByRaceId: Record<number, RaceLineupEntry[]> = {};
  try {
    lineupsByRaceId = await fetchRaceLineupsFromDb([
      ...predictionContext.raceIdToMeetingKey.keys(),
    ]);
  } catch (err) {
    console.error("[race-prediction] Could not read race lineup overrides:", err);
  }
  const lineupByMeetingKey: Record<number, RaceLineupEntry[]> = {};
  for (const [raceId, entries] of Object.entries(lineupsByRaceId)) {
    const meetingKey = predictionContext.raceIdToMeetingKey.get(Number(raceId));
    if (meetingKey !== undefined) lineupByMeetingKey[meetingKey] = entries;
  }

  // Fetch drivers (already resolved inside the shared context) and teams.
  // Passed through untouched: overrides are applied per round on the client.
  const allDrivers = predictionContext.allDrivers;
  const allTeams = await fetchTeamsFromDb();
  const teamsWithDrivers = await fetchTeamsWithDrivers();

  // Predictions, champion data and results — all assembled by the shared
  // fetchers (packages/shared/lib), reusing the one prediction context.
  const predictions = await fetchUserRacePredictions(
    supabase,
    viewingUserId,
    RACES,
    predictionContext
  );
  const sprintPredictions = await fetchUserSprintPredictions(
    supabase,
    viewingUserId,
    RACES,
    predictionContext
  );
  const { championPrediction, teamBestDriverPredictions } = await fetchChampionPredictionData(
    supabase,
    viewingUserId,
    teamsWithDrivers,
    predictionContext
  );
  const raceResults = await fetchRaceResults(supabase, predictionContext);
  const sprintResults = await fetchSprintResults(supabase, predictionContext);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} isAdmin={isAdminUser(user)} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <RacePredictionContent
            races={RACES}
            drivers={allDrivers}
            lineupByMeetingKey={lineupByMeetingKey}
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
