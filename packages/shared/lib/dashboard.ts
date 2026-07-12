import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LeaderboardEntry,
  Race,
  RacePrediction,
  PredictionStatus,
  UserStats,
} from "../types";
import {
  buildLeaderboardEntries,
  rankLeaderboardEntries,
  type LeaderboardProfileRow,
  type LeaderboardTotalsRow,
} from "./leaderboard";
import { getNextRace, getRaceCalendarEntries, type RaceCalendarEntry } from "./race-utils";

/** Per-user prediction row shape shared by race and sprint predictions. */
export interface UserPredictionRow {
  race_id: number;
  status: string | null;
  points_earned: number | null;
}

/**
 * Builds one dashboard prediction summary per race by merging the user's race
 * and sprint prediction rows (keyed via the raceId → meetingKey map):
 * - points: race + sprint points combined; `undefined` when neither is scored.
 * - status: "scored" once the race prediction is scored; "submitted" only when
 *   the race prediction is submitted AND (for sprint weekends) the sprint
 *   prediction is submitted or scored; otherwise "pending".
 * Pure function.
 */
export function buildDashboardPredictions(
  races: Race[],
  racePredictionRows: UserPredictionRow[],
  sprintPredictionRows: UserPredictionRow[],
  raceIdToMeetingKey: Map<number, number>
): RacePrediction[] {
  const sprintEarningsByMeetingKey = new Map<number, number>();
  const sprintStatusByMeetingKey = new Map<number, PredictionStatus>();
  for (const sp of sprintPredictionRows) {
    const meetingKey = raceIdToMeetingKey.get(sp.race_id);
    if (meetingKey === undefined) continue;
    if (sp.points_earned != null) sprintEarningsByMeetingKey.set(meetingKey, sp.points_earned);
    if (sp.status) sprintStatusByMeetingKey.set(meetingKey, sp.status as PredictionStatus);
  }

  return races.map((race) => {
    const pred = racePredictionRows.find(
      (p) => raceIdToMeetingKey.get(p.race_id) === race.meetingKey
    );
    const racePts = pred?.points_earned ?? null;
    const sprintPts = race.hasSprint ? (sprintEarningsByMeetingKey.get(race.meetingKey) ?? null) : null;
    const totalPts =
      racePts !== null || sprintPts !== null
        ? (racePts ?? 0) + (sprintPts ?? 0)
        : undefined;

    // Combined status: for sprint weekends, "submitted" requires both race and sprint predictions submitted.
    const raceStatus = (pred?.status as PredictionStatus | undefined) ?? "pending";
    const sprintStatus = sprintStatusByMeetingKey.get(race.meetingKey) ?? "pending";
    let combinedStatus: PredictionStatus;
    if (raceStatus === "scored") {
      combinedStatus = "scored";
    } else {
      const raceDone = raceStatus === "submitted";
      const sprintDone = !race.hasSprint || sprintStatus === "submitted" || sprintStatus === "scored";
      combinedStatus = raceDone && sprintDone ? "submitted" : "pending";
    }

    return {
      raceId: race.meetingKey,
      raceName: race.raceName,
      round: race.round,
      status: combinedStatus,
      top10: [],
      pointsEarned: totalPts,
      maxPoints: 42,
    };
  });
}

/** The user's raw profile row — the caller applies auth-metadata fallbacks. */
export interface DashboardProfile {
  displayName: string | null;
  avatarUrl: string | null;
}

/** Everything the home dashboard needs (achievements and championship standings excluded — they have dedicated shared fetchers). */
export interface DashboardData {
  profile: DashboardProfile;
  userStats: UserStats;
  /** Top 10 of the full ranked leaderboard (shared ranks, alphabetical tiebreak). */
  leaderboard: LeaderboardEntry[];
  /** Per-race combined race + sprint prediction summaries, one per passed race. */
  predictions: RacePrediction[];
  calendarEntries: RaceCalendarEntry[];
  nextRace: Race | null;
}

/**
 * Fetches and assembles the home dashboard data for one user: profile row,
 * ranked leaderboard top 10, the user's rank / total registered users, per-race
 * combined prediction summaries, calendar entries, and the next race.
 *
 * `races` is the already-fetched current-season calendar (via the shared
 * `fetchRaces`) so callers reuse it for rendering. The caller injects the
 * Supabase client.
 */
export async function fetchDashboardData(
  supabase: SupabaseClient,
  userId: string,
  races: Race[]
): Promise<DashboardData> {
  const [
    { data: profileRow },
    { data: racePredictions },
    { data: sprintPredictions },
    { data: currentSeason },
    { data: allProfiles },
    { data: leaderboardRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .single(),
    supabase
      .from("race_predictions")
      .select("race_id, status, points_earned")
      .eq("user_id", userId),
    supabase
      .from("sprint_predictions")
      .select("race_id, status, points_earned")
      .eq("user_id", userId),
    // Current season, so the raceId→meetingKey mapping is season-aware
    supabase.from("seasons").select("id").eq("is_current", true).single(),
    // Every registered user — the source of truth for total count + leaderboard
    supabase
      .from("profiles")
      .select("id, display_name")
      .order("display_name", { ascending: true }),
    supabase.from("leaderboard").select("user_id, total_points, predictions_count"),
  ]);

  // Build mapping: DB race ID -> meeting key
  const { data: dbRaces } = await supabase
    .from("races")
    .select("id, meeting_key")
    .eq("season_id", currentSeason?.id ?? -1);

  const raceIdToMeetingKey = new Map<number, number>();
  for (const r of dbRaces ?? []) {
    raceIdToMeetingKey.set(r.id, r.meeting_key);
  }

  // Full ranked leaderboard (no per-race breakdown needed → empty race keys)
  const unranked = buildLeaderboardEntries(
    (allProfiles ?? []) as LeaderboardProfileRow[],
    (leaderboardRows ?? []) as LeaderboardTotalsRow[],
    {},
    []
  );
  const allRanked = rankLeaderboardEntries(unranked);

  const leaderboard: LeaderboardEntry[] = allRanked
    .slice(0, 10)
    .map(({ rank, userId: id, displayName, totalPoints, predictionsCount }) => ({
      rank,
      userId: id,
      displayName,
      totalPoints,
      predictionsCount,
    }));

  const currentUserEntry = allRanked.find((e) => e.userId === userId);

  const userStats: UserStats = {
    totalPoints: currentUserEntry?.totalPoints ?? 0,
    rank: currentUserEntry?.rank ?? 0,
    totalUsers: (allProfiles ?? []).length,
  };

  const predictions = buildDashboardPredictions(
    races,
    (racePredictions ?? []) as UserPredictionRow[],
    (sprintPredictions ?? []) as UserPredictionRow[],
    raceIdToMeetingKey
  );

  // Prediction status map for the calendar
  const predictionStatusByMeetingKey = new Map<number, PredictionStatus>();
  for (const pred of predictions) {
    predictionStatusByMeetingKey.set(pred.raceId, pred.status);
  }
  const calendarEntries = getRaceCalendarEntries(races, predictionStatusByMeetingKey);

  return {
    profile: {
      displayName: profileRow?.display_name ?? null,
      avatarUrl: profileRow?.avatar_url ?? null,
    },
    userStats,
    leaderboard,
    predictions,
    calendarEntries,
    nextRace: getNextRace(races) ?? null,
  };
}
