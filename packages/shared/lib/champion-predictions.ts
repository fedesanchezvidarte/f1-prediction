import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChampionPrediction,
  SeasonAwardPrediction,
  TeamBestDriverPrediction,
  TeamWithDrivers,
} from "../types";
import { createPredictionContext, type PredictionContext } from "./predictions";

/** Everything the champion tab needs, assembled from season award rows. */
export interface ChampionPredictionData {
  seasonAwardPredictions: SeasonAwardPrediction[];
  championPrediction: ChampionPrediction;
  teamBestDriverPredictions: TeamBestDriverPrediction[];
}

/** Empty champion prediction used when nothing is stored yet (or no season). */
function emptyChampionPrediction(userId: string): ChampionPrediction {
  return {
    userId,
    status: "pending",
    wdcWinner: null,
    wccWinner: null,
    mostDnfsDriver: null,
    mostPodiumsDriver: null,
    mostWinsDriver: null,
    pointsEarned: 0,
    wdcPoints: 0,
    wccPoints: 0,
    mostDnfsPoints: 0,
    mostPodiumsPoints: 0,
    mostWinsPoints: 0,
    isHalfPoints: false,
  };
}

/**
 * Fetches a user's season award predictions (the unified champion + team best
 * driver rows) for the current season and assembles them into the legacy
 * `ChampionPrediction` + `TeamBestDriverPrediction[]` shapes the prediction
 * UI consumes.
 *
 * `teamsWithDrivers` is passed in (already fetched via `fetchTeamsWithDrivers`)
 * so teams aren't queried twice. The caller injects the Supabase client (and,
 * optionally, a pre-built `PredictionContext`). Returns empty/pending
 * placeholders when there is no current season.
 */
export async function fetchChampionPredictionData(
  supabase: SupabaseClient,
  userId: string,
  teamsWithDrivers: TeamWithDrivers[],
  context?: PredictionContext | null
): Promise<ChampionPredictionData> {
  const emptyTeamBest: TeamBestDriverPrediction[] = teamsWithDrivers.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    teamColor: team.color,
    driverId: null,
    driverNumber: null,
    isHalfPoints: false,
    status: "pending",
    pointsEarned: 0,
  }));

  const ctx = context ?? (await createPredictionContext(supabase));
  if (!ctx) {
    return {
      seasonAwardPredictions: [],
      championPrediction: emptyChampionPrediction(userId),
      teamBestDriverPredictions: emptyTeamBest,
    };
  }
  const { seasonId, findDriver } = ctx;

  // Season award prediction rows (unified champion + team best driver)
  const { data: seasonAwardRows } = await supabase
    .from("season_award_predictions")
    .select(
      "id, award_type_id, driver_id, team_id, is_half_points, status, points_earned, season_award_types(slug, name, subject_type, scope_team_id, points_value, sort_order)"
    )
    .eq("user_id", userId)
    .eq("season_id", seasonId);

  const seasonAwardPredictions: SeasonAwardPrediction[] = (seasonAwardRows ?? []).map((row) => {
    const rawAwardType = row.season_award_types;
    const awardType = (Array.isArray(rawAwardType) ? rawAwardType[0] : rawAwardType) as {
      slug: string;
      name: string;
      subject_type: string;
      scope_team_id: number | null;
      points_value: number;
      sort_order: number;
    } | null;
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

  // Build the legacy ChampionPrediction from the season award rows
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

  // Determine overall champion status from the individual awards
  const championAwards = [wdcAward, wccAward, mostDnfsAward, mostPodiumsAward, mostWinsAward];
  const hasAnyChampionSubmitted = championAwards.some(
    (a) => a?.status === "submitted" || a?.status === "scored"
  );
  const hasAnyChampionScored = championAwards.some((a) => a?.status === "scored");
  const anyHalfPoints = championAwards.some((a) => a?.isHalfPoints);

  const championPrediction: ChampionPrediction = {
    userId,
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

  // Build the legacy TeamBestDriverPrediction[] from the season award rows
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

  return { seasonAwardPredictions, championPrediction, teamBestDriverPredictions };
}
