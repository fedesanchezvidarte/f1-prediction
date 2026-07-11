import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetailedLeaderboardEntry, Race } from "../types";

/** Profile row shape used by the leaderboard assembly. */
export interface LeaderboardProfileRow {
  id: string;
  display_name: string | null;
}

/** Leaderboard row shape (exists only for users with scored predictions). */
export interface LeaderboardTotalsRow {
  user_id: string;
  total_points: number | null;
  predictions_count: number | null;
}

/** Scored prediction row shape shared by race and sprint predictions. */
export interface ScoredPredictionRow {
  user_id: string;
  race_id: number;
  points_earned: number | null;
}

/** Per-user, per-meeting-key points map: userId -> meetingKey -> points (null = no scored prediction). */
export type RacePointsMap = Record<string, Record<number, number | null>>;

/**
 * Merges scored race + sprint prediction rows into a per-user, per-race points map.
 * Race points seed each cell (null when points_earned is null); sprint points are
 * added on top, treating a missing race cell as 0. Rows whose race_id has no
 * meeting-key mapping are skipped. Pure function.
 */
export function buildRacePointsMap(
  racePreds: ScoredPredictionRow[],
  sprintPreds: ScoredPredictionRow[],
  raceIdToMeetingKey: Map<number, number>
): RacePointsMap {
  const racePointsMap: RacePointsMap = {};

  for (const pred of racePreds) {
    const meetingKey = raceIdToMeetingKey.get(pred.race_id);
    if (meetingKey === undefined) continue;
    if (!racePointsMap[pred.user_id]) racePointsMap[pred.user_id] = {};
    racePointsMap[pred.user_id][meetingKey] = pred.points_earned ?? null;
  }

  for (const pred of sprintPreds) {
    const meetingKey = raceIdToMeetingKey.get(pred.race_id);
    if (meetingKey === undefined) continue;
    if (!racePointsMap[pred.user_id]) racePointsMap[pred.user_id] = {};
    const existing = racePointsMap[pred.user_id][meetingKey] ?? 0;
    racePointsMap[pred.user_id][meetingKey] = existing + (pred.points_earned ?? 0);
  }

  return racePointsMap;
}

/**
 * Builds one unranked entry per profile — every registered user appears,
 * defaulting to 0 points / 0 predictions when they have no leaderboard row.
 * Each entry carries a per-race points cell for every passed meeting key
 * (null when the user has no scored prediction for that race). Pure function.
 */
export function buildLeaderboardEntries(
  profiles: LeaderboardProfileRow[],
  leaderboardRows: LeaderboardTotalsRow[],
  racePointsMap: RacePointsMap,
  raceKeys: number[]
): Omit<DetailedLeaderboardEntry, "rank">[] {
  const leaderboardMap = new Map(leaderboardRows.map((r) => [r.user_id, r]));

  return profiles.map((p) => {
    const lb = leaderboardMap.get(p.id);
    const racePoints: Record<number, number | null> = {};
    for (const key of raceKeys) {
      racePoints[key] = racePointsMap[p.id]?.[key] ?? null;
    }
    return {
      userId: p.id,
      displayName: p.display_name ?? "Driver",
      totalPoints: lb?.total_points ?? 0,
      predictionsCount: lb?.predictions_count ?? 0,
      racePoints,
    };
  });
}

/**
 * Sorts entries (highest points first, ties broken alphabetically by display
 * name) and assigns ranks, sharing the rank between tied point totals
 * (1, 1, 3, ... competition ranking). Does not mutate the input. Pure function.
 */
export function rankLeaderboardEntries(
  unranked: Omit<DetailedLeaderboardEntry, "rank">[]
): DetailedLeaderboardEntry[] {
  const sorted = [...unranked].sort((a, b) =>
    b.totalPoints !== a.totalPoints
      ? b.totalPoints - a.totalPoints
      : a.displayName.localeCompare(b.displayName)
  );

  const entries: DetailedLeaderboardEntry[] = [];
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].totalPoints < sorted[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    entries.push({ ...sorted[i], rank: currentRank });
  }
  return entries;
}

/**
 * Fetches the full detailed leaderboard: one ranked entry per registered
 * profile with total points and a per-race (race + sprint merged) points
 * breakdown keyed by meeting key.
 *
 * `races` provides the meeting keys for the breakdown columns — the caller
 * fetches them once via the shared `fetchRaces` and reuses them for rendering.
 * The caller injects the Supabase client.
 */
export async function fetchDetailedLeaderboard(
  supabase: SupabaseClient,
  races: Race[]
): Promise<DetailedLeaderboardEntry[]> {
  // Every registered user — the source of truth for "all players"
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  // Leaderboard rows (only exist for users who have scored predictions)
  const { data: leaderboardRows } = await supabase
    .from("leaderboard")
    .select("user_id, total_points, predictions_count");

  // Current season, so the raceId→meetingKey mapping is season-aware
  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  const { data: dbRaces } = await supabase
    .from("races")
    .select("id, meeting_key")
    .eq("season_id", currentSeason?.id ?? -1);

  const raceIdToMeetingKey = new Map<number, number>();
  for (const r of dbRaces ?? []) {
    raceIdToMeetingKey.set(r.id, r.meeting_key);
  }

  // Scored race + sprint predictions for all users (per-race breakdown)
  const [{ data: racePreds }, { data: sprintPreds }] = await Promise.all([
    supabase
      .from("race_predictions")
      .select("user_id, race_id, points_earned")
      .eq("status", "scored"),
    supabase
      .from("sprint_predictions")
      .select("user_id, race_id, points_earned")
      .eq("status", "scored"),
  ]);

  const racePointsMap = buildRacePointsMap(
    (racePreds ?? []) as ScoredPredictionRow[],
    (sprintPreds ?? []) as ScoredPredictionRow[],
    raceIdToMeetingKey
  );

  const unranked = buildLeaderboardEntries(
    (allProfiles ?? []) as LeaderboardProfileRow[],
    (leaderboardRows ?? []) as LeaderboardTotalsRow[],
    racePointsMap,
    races.map((r) => r.meetingKey)
  );

  return rankLeaderboardEntries(unranked);
}
