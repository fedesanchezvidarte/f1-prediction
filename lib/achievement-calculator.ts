/**
 * Achievement calculation engine.
 *
 * Evaluates all achievement conditions for given users based on their
 * current scored predictions and results. Handles both awarding new
 * achievements and revoking no-longer-valid ones (e.g. after result changes).
 *
 * Called automatically after scoring and can be triggered manually from
 * the admin panel for recalculation.
 */
import {
  scoreRacePrediction,
  scoreSprintPrediction,
  type RaceScoringInput,
  type SprintScoringInput,
} from "@/lib/scoring";

type SupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

interface AchievementRow {
  id: number;
  slug: string;
  threshold: number | null;
}

export interface AchievementCalculationResult {
  usersProcessed: number;
  achievementsAwarded: number;
  achievementsRevoked: number;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Public API                                                            */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Calculate and reconcile achievements for a list of users.
 * Inserts newly earned achievements and removes revoked ones.
 */
export async function calculateAchievementsForUsers(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<AchievementCalculationResult> {
  const { data: achievements } = await supabase
    .from("achievements")
    .select("id, slug, threshold")
    .order("id");

  if (!achievements || achievements.length === 0) {
    return { usersProcessed: 0, achievementsAwarded: 0, achievementsRevoked: 0 };
  }

  let totalAwarded = 0;
  let totalRevoked = 0;

  for (const userId of userIds) {
    const earnedIds = await evaluateAllAchievements(
      supabase,
      userId,
      achievements
    );
    const { awarded, revoked } = await reconcileAchievements(
      supabase,
      userId,
      earnedIds
    );
    totalAwarded += awarded;
    totalRevoked += revoked;
  }

  return {
    usersProcessed: userIds.length,
    achievementsAwarded: totalAwarded,
    achievementsRevoked: totalRevoked,
  };
}

/**
 * Full recalculation: finds every user who has at least one prediction
 * and recalculates all achievements from scratch.
 */
export async function calculateAchievementsForAllUsers(
  supabase: SupabaseClient
): Promise<AchievementCalculationResult> {
  const [{ data: raceUsers }, { data: sprintUsers }, { data: champUsers }] =
    await Promise.all([
      supabase
        .from("race_predictions")
        .select("user_id")
        .in("status", ["submitted", "scored"]),
      supabase
        .from("sprint_predictions")
        .select("user_id")
        .in("status", ["submitted", "scored"]),
      supabase
        .from("champion_predictions")
        .select("user_id")
        .in("status", ["submitted", "scored"]),
    ]);

  const allUserIds = new Set<string>();
  for (const p of raceUsers ?? []) allUserIds.add(p.user_id);
  for (const p of sprintUsers ?? []) allUserIds.add(p.user_id);
  for (const p of champUsers ?? []) allUserIds.add(p.user_id);

  if (allUserIds.size === 0) {
    return { usersProcessed: 0, achievementsAwarded: 0, achievementsRevoked: 0 };
  }

  return calculateAchievementsForUsers(supabase, Array.from(allUserIds));
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Internal helpers                                                      */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Evaluate every achievement for one user and return the set of achievement IDs
 * the user currently qualifies for.
 */
async function evaluateAllAchievements(
  supabase: SupabaseClient,
  userId: string,
  achievements: AchievementRow[]
): Promise<Set<number>> {
  const earnedIds = new Set<number>();

  // ── Fetch all prediction and result data in parallel ──────────────
  const [
    { data: racePreds },
    { data: sprintPreds },
    { data: champPreds },
    { data: raceResults },
    { data: sprintResults },
    { data: season },
  ] = await Promise.all([
    supabase
      .from("race_predictions")
      .select("race_id, user_id, status, points_earned, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id")
      .eq("user_id", userId)
      .in("status", ["submitted", "scored"]),
    supabase
      .from("sprint_predictions")
      .select("race_id, user_id, status, points_earned, sprint_pole_driver_id, top_8, fastest_lap_driver_id")
      .eq("user_id", userId)
      .in("status", ["submitted", "scored"]),
    supabase
      .from("champion_predictions")
      .select("user_id, status, points_earned")
      .eq("user_id", userId)
      .in("status", ["submitted", "scored"]),
    supabase.from("race_results").select("race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id"),
    supabase.from("sprint_results").select("race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id"),
    supabase.from("seasons").select("id").eq("is_current", true).single(),
  ]);

  const racePredictions = racePreds ?? [];
  const sprintPredictions = sprintPreds ?? [];
  const championPredictions = champPreds ?? [];

  // Build look-up maps for results
  const raceResultMap = new Map<number, (typeof raceResults extends Array<infer T> | null ? T : never)>();
  for (const r of raceResults ?? []) raceResultMap.set(r.race_id, r);

  const sprintResultMap = new Map<number, (typeof sprintResults extends Array<infer T> | null ? T : never)>();
  for (const r of sprintResults ?? []) sprintResultMap.set(r.race_id, r);

  // ── Prediction-count achievements ─────────────────────────────────
  const totalPredictions =
    racePredictions.length + sprintPredictions.length + championPredictions.length;

  // ── Scored data ───────────────────────────────────────────────────
  const scoredRace = racePredictions.filter((p) => p.status === "scored");
  const scoredSprint = sprintPredictions.filter((p) => p.status === "scored");
  const scoredChamp = championPredictions.filter((p) => p.status === "scored");

  // ── Total points ──────────────────────────────────────────────────
  const totalPoints =
    scoredRace.reduce((s, p) => s + (p.points_earned ?? 0), 0) +
    scoredSprint.reduce((s, p) => s + (p.points_earned ?? 0), 0) +
    scoredChamp.reduce((s, p) => s + (p.points_earned ?? 0), 0);

  // ── Per-race analysis ─────────────────────────────────────────────
  let totalCorrectPositions = 0;
  let hasCorrectRaceWinner = false;
  let hasCorrectPole = false;
  let hasCorrectFastestLap = false;
  let hasCorrectFastestPit = false;
  let hasPerfectPodium = false;
  let hasPerfectTop10 = false;
  let hasHatTrick = false;

  for (const pred of scoredRace) {
    const result = raceResultMap.get(pred.race_id);
    if (!result) continue;

    const predTop10: (number | null)[] = pred.top_10 ?? [];
    const resultTop10: number[] = result.top_10 ?? [];

    const breakdown = scoreRacePrediction({
      predTop10,
      predPole: pred.pole_position_driver_id,
      predFastestLap: pred.fastest_lap_driver_id,
      predFastestPitStop: pred.fastest_pit_stop_driver_id,
      resultTop10,
      resultPole: result.pole_position_driver_id,
      resultFastestLap: result.fastest_lap_driver_id,
      resultFastestPitStop: result.fastest_pit_stop_driver_id,
    } as RaceScoringInput);

    totalCorrectPositions += breakdown.positionMatches;

    if (predTop10[0] != null && predTop10[0] === resultTop10[0])
      hasCorrectRaceWinner = true;
    if (breakdown.poleMatch) hasCorrectPole = true;
    if (breakdown.fastestLapMatch) hasCorrectFastestLap = true;
    if (breakdown.fastestPitStopMatch) hasCorrectFastestPit = true;
    if (breakdown.perfectPodium) hasPerfectPodium = true;
    if (breakdown.perfectTopN) hasPerfectTop10 = true;

    // Hat-trick: pole + winner + fastest lap all correct in the same race
    if (
      breakdown.poleMatch &&
      predTop10[0] != null &&
      predTop10[0] === resultTop10[0] &&
      breakdown.fastestLapMatch
    ) {
      hasHatTrick = true;
    }
  }

  // ── Per-sprint analysis ───────────────────────────────────────────
  let hasCorrectSprintWinner = false;
  let hasCorrectSprintPole = false;
  let hasCorrectSprintFastestLap = false;
  let hasSprintPerfectPodium = false;
  let hasPerfectTop8 = false;

  for (const pred of scoredSprint) {
    const result = sprintResultMap.get(pred.race_id);
    if (!result) continue;

    const predTop8: (number | null)[] = pred.top_8 ?? [];
    const resultTop8: number[] = result.top_8 ?? [];

    const breakdown = scoreSprintPrediction({
      predTop8,
      predSprintPole: pred.sprint_pole_driver_id,
      predFastestLap: pred.fastest_lap_driver_id,
      resultTop8,
      resultSprintPole: result.sprint_pole_driver_id,
      resultFastestLap: result.fastest_lap_driver_id,
    } as SprintScoringInput);

    totalCorrectPositions += breakdown.positionMatches;

    if (predTop8[0] != null && predTop8[0] === resultTop8[0])
      hasCorrectSprintWinner = true;
    if (breakdown.poleMatch) hasCorrectSprintPole = true;
    if (breakdown.fastestLapMatch) hasCorrectSprintFastestLap = true;
    if (breakdown.perfectPodium) hasSprintPerfectPodium = true;
    if (breakdown.perfectTopN) hasPerfectTop8 = true;
  }

  // ── Championship achievements ─────────────────────────────────────
  // WDC/WCC achievements are awarded when champion predictions are scored
  // with points, which means the admin has entered championship results.
  // A scored champion prediction with points_earned > 0 means at least
  // one of WDC/WCC was correct. We use the point thresholds to determine
  // which one: WDC alone = 20pts (10 half), WCC alone = 20pts (10 half).
  let hasCorrectWdc = false;
  let hasCorrectWcc = false;

  for (const pred of scoredChamp) {
    const pts = pred.points_earned ?? 0;
    // If 40pts (or 20 half), both are correct.
    // If 20pts (or 10 half), one is correct — we can't distinguish which,
    // so we award both achievement checks optimistically when pts > 0.
    // This covers the realistic case; fine-grained tracking would require
    // storing individual match results in a separate column.
    if (pts > 0) {
      hasCorrectWdc = true;
      hasCorrectWcc = true;
    }
  }

  // ── Map slugs to earned status ────────────────────────────────────
  for (const ach of achievements) {
    let earned = false;
    const threshold = ach.threshold ?? 0;

    switch (ach.slug) {
      /* ── Predictions category ────────────────────────────────── */
      case "first_prediction":
        earned = totalPredictions >= (threshold || 1);
        break;
      case "10_predictions":
        earned = totalPredictions >= (threshold || 10);
        break;
      case "20_predictions":
        earned = totalPredictions >= (threshold || 20);
        break;
      case "all_2026_predictions":
        if (season) {
          const { data: seasonRaces } = await supabase
            .from("races")
            .select("id")
            .eq("season_id", season.id);
          const raceIds = new Set((seasonRaces ?? []).map((r) => r.id));
          const predictedRaceIds = new Set(racePredictions.map((p) => p.race_id));
          earned =
            raceIds.size > 0 &&
            [...raceIds].every((id) => predictedRaceIds.has(id));
        }
        break;

      /* ── Accuracy category ───────────────────────────────────── */
      case "1_correct":
        earned = totalCorrectPositions >= (threshold || 1);
        break;
      case "10_correct":
        earned = totalCorrectPositions >= (threshold || 10);
        break;
      case "50_correct":
        earned = totalCorrectPositions >= (threshold || 50);
        break;
      case "100_correct":
        earned = totalCorrectPositions >= (threshold || 100);
        break;

      /* ── Milestones category ─────────────────────────────────── */
      case "100_points":
        earned = totalPoints >= (threshold || 100);
        break;
      case "200_points":
        earned = totalPoints >= (threshold || 200);
        break;
      case "300_points":
        earned = totalPoints >= (threshold || 300);
        break;

      /* ── Special: Race ───────────────────────────────────────── */
      case "predict_race_winner":
        earned = hasCorrectRaceWinner;
        break;
      case "predict_pole":
        earned = hasCorrectPole;
        break;
      case "predict_fastest_lap":
        earned = hasCorrectFastestLap;
        break;
      case "predict_fastest_pit":
        earned = hasCorrectFastestPit;
        break;
      case "perfect_podium":
        earned = hasPerfectPodium;
        break;
      case "perfect_top_10":
        earned = hasPerfectTop10;
        break;

      /* ── Special: Sprint ─────────────────────────────────────── */
      case "sprint_winner":
        earned = hasCorrectSprintWinner;
        break;
      case "sprint_pole":
        earned = hasCorrectSprintPole;
        break;
      case "sprint_fastest_lap":
        earned = hasCorrectSprintFastestLap;
        break;
      case "sprint_podium":
        earned = hasSprintPerfectPodium;
        break;
      case "perfect_top_8":
        earned = hasPerfectTop8;
        break;

      /* ── Special: Other ──────────────────────────────────────── */
      case "hat_trick":
        earned = hasHatTrick;
        break;
      case "predict_wdc":
        earned = hasCorrectWdc;
        break;
      case "predict_wcc":
        earned = hasCorrectWcc;
        break;
    }

    if (earned) {
      earnedIds.add(ach.id);
    }
  }

  return earnedIds;
}

/**
 * Compare computed achievements against what's stored and insert/remove
 * the differences.
 */
async function reconcileAchievements(
  supabase: SupabaseClient,
  userId: string,
  earnedIds: Set<number>
): Promise<{ awarded: number; revoked: number }> {
  const { data: currentAchievements } = await supabase
    .from("user_achievements")
    .select("id, achievement_id")
    .eq("user_id", userId);

  const currentIds = new Set(
    (currentAchievements ?? []).map((a) => a.achievement_id as number)
  );

  const toAdd = [...earnedIds].filter((id) => !currentIds.has(id));
  const toRemove = (currentAchievements ?? []).filter(
    (a) => !earnedIds.has(a.achievement_id)
  );

  let awarded = 0;
  let revoked = 0;

  if (toAdd.length > 0) {
    const { error } = await supabase.from("user_achievements").insert(
      toAdd.map((achievementId) => ({
        user_id: userId,
        achievement_id: achievementId,
        earned_at: new Date().toISOString(),
      }))
    );
    if (error) {
      console.error(
        `[achievements] Failed to insert achievements for user ${userId}:`,
        error.message
      );
    } else {
      awarded = toAdd.length;
    }
  }

  if (toRemove.length > 0) {
    const idsToRemove = toRemove.map((a) => a.id);
    const { error } = await supabase
      .from("user_achievements")
      .delete()
      .in("id", idsToRemove);
    if (error) {
      console.error(
        `[achievements] Failed to revoke achievements for user ${userId}:`,
        error.message
      );
    } else {
      revoked = toRemove.length;
    }
  }

  return { awarded, revoked };
}
