import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RacePredictionContent } from "@/components/predictions/RacePredictionContent";
import {
  DRIVERS_2026,
  RACES_2026,
  TEAMS_2026,
} from "@/lib/dummy-data";
import type {
  FullRacePrediction,
  SprintPrediction,
  ChampionPrediction,
  RaceResult,
  SprintResult,
  Driver,
} from "@/types";

export default async function RacePredictionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  function findDriver(id: number | null): Driver | null {
    if (!id) return null;
    return DRIVERS_2026.find((d) => d.driverNumber === id) ?? null;
  }

  const { data: racePredRows } = await supabase
    .from("race_predictions")
    .select("race_id, status, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, points_earned")
    .eq("user_id", user.id);

  const predictions: FullRacePrediction[] = RACES_2026.map((race) => {
    const row = (racePredRows ?? []).find((r) => r.race_id === race.meetingKey);
    const top10Ids: (number | null)[] = row?.top_10 ?? [];
    return {
      raceId: race.meetingKey,
      userId: user.id,
      status: row?.status ?? "pending",
      polePosition: findDriver(row?.pole_position_driver_id ?? null),
      raceWinner: findDriver(top10Ids[0] ?? null),
      restOfTop10: Array.from({ length: 9 }, (_, i) => findDriver(top10Ids[i + 1] ?? null)),
      fastestLap: findDriver(row?.fastest_lap_driver_id ?? null),
      fastestPitStop: findDriver(row?.fastest_pit_stop_driver_id ?? null),
      pointsEarned: row?.points_earned ?? null,
    };
  });

  const { data: sprintPredRows } = await supabase
    .from("sprint_predictions")
    .select("race_id, status, sprint_pole_driver_id, top_8, fastest_lap_driver_id, points_earned")
    .eq("user_id", user.id);

  const sprintRaces = RACES_2026.filter((r) => r.hasSprint);
  const sprintPredictions: SprintPrediction[] = sprintRaces.map((race) => {
    const row = (sprintPredRows ?? []).find((r) => r.race_id === race.meetingKey);
    const top8Ids: (number | null)[] = row?.top_8 ?? [];
    return {
      raceId: race.meetingKey,
      userId: user.id,
      status: row?.status ?? "pending",
      sprintPole: findDriver(row?.sprint_pole_driver_id ?? null),
      sprintWinner: findDriver(top8Ids[0] ?? null),
      restOfTop8: Array.from({ length: 7 }, (_, i) => findDriver(top8Ids[i + 1] ?? null)),
      fastestLap: findDriver(row?.fastest_lap_driver_id ?? null),
      pointsEarned: row?.points_earned ?? null,
    };
  });

  const { data: champRow } = await supabase
    .from("champion_predictions")
    .select("status, wdc_driver_id, wcc_team_id, points_earned, is_half_points")
    .eq("user_id", user.id)
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
    userId: user.id,
    status: champRow?.status ?? "pending",
    wdcWinner: findDriver(champRow?.wdc_driver_id ?? null),
    wccWinner: wccTeamName,
    pointsEarned: champRow?.points_earned ?? null,
    isHalfPoints: champRow?.is_half_points ?? false,
  };

  const { data: raceResultRows } = await supabase
    .from("race_results")
    .select("race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id");

  const raceResults: Record<number, RaceResult> = {};
  for (const row of raceResultRows ?? []) {
    const top10Ids: number[] = row.top_10 ?? [];
    const top10 = top10Ids.map((id) => findDriver(id)).filter((d): d is Driver => d !== null);
    const pole = findDriver(row.pole_position_driver_id);
    const fastestLap = findDriver(row.fastest_lap_driver_id);
    const fastestPit = findDriver(row.fastest_pit_stop_driver_id);
    if (top10.length > 0 && pole && fastestLap && fastestPit) {
      raceResults[row.race_id] = {
        raceId: row.race_id,
        polePosition: pole,
        raceWinner: top10[0],
        top10,
        fastestLap,
        fastestPitStop: fastestPit,
      };
    }
  }

  const { data: sprintResultRows } = await supabase
    .from("sprint_results")
    .select("race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id");

  const sprintResults: Record<number, SprintResult> = {};
  for (const row of sprintResultRows ?? []) {
    const top8Ids: number[] = row.top_8 ?? [];
    const top8 = top8Ids.map((id) => findDriver(id)).filter((d): d is Driver => d !== null);
    const pole = findDriver(row.sprint_pole_driver_id);
    const fastestLap = findDriver(row.fastest_lap_driver_id);
    if (top8.length > 0 && pole && fastestLap) {
      sprintResults[row.race_id] = {
        raceId: row.race_id,
        sprintPole: pole,
        sprintWinner: top8[0],
        top8,
        fastestLap,
      };
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <RacePredictionContent
            races={RACES_2026}
            drivers={DRIVERS_2026}
            teams={TEAMS_2026}
            predictions={predictions}
            sprintPredictions={sprintPredictions}
            championPrediction={championPrediction}
            raceResults={raceResults}
            sprintResults={sprintResults}
            isOwner={true}
            displayName={displayName}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
