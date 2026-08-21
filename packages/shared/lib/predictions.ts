import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Driver,
  FullRacePrediction,
  PredictionStatus,
  Race,
  SprintPrediction,
} from "../types";
import { fetchDrivers } from "./drivers";

interface RacePredictionRow {
  race_id: number;
  status: PredictionStatus | null;
  pole_position_driver_id: number | null;
  qualifying_top_3: (number | null)[] | null;
  top_10: (number | null)[] | null;
  fastest_lap_driver_id: number | null;
  fastest_pit_stop_driver_id: number | null;
  driver_of_the_day_driver_id: number | null;
  points_earned: number | null;
}

interface SprintPredictionRow {
  race_id: number;
  status: PredictionStatus | null;
  sprint_pole_driver_id: number | null;
  qualifying_top_3: (number | null)[] | null;
  top_8: (number | null)[] | null;
  fastest_lap_driver_id: number | null;
  points_earned: number | null;
}

/**
 * Season-scoped lookup context shared by every prediction/result fetcher:
 * resolves DB driver ids to full `Driver` objects and DB race ids to meeting
 * keys. Build it once per request (web Server Component) and pass it to each
 * fetcher to avoid re-querying the same mappings; when omitted, each fetcher
 * builds its own (the idiomatic mobile/TanStack-Query path).
 */
export interface PredictionContext {
  seasonId: number;
  raceIdToMeetingKey: Map<number, number>;
  /**
   * The selectable grid: active drivers only. This is what the prediction
   * pickers render.
   */
  allDrivers: Driver[];
  /**
   * The full season roster, including drivers deactivated mid-season. Used only
   * to resolve stored driver ids — see `findDriver`.
   */
  rosterDrivers: Driver[];
  /**
   * Resolves a stored `drivers.id` against the full roster, so a prediction or
   * result naming a since-deactivated driver still renders their name instead
   * of collapsing to `null` (which would blank the slot, and shift every
   * position below it in the results arrays).
   */
  findDriver: (dbDriverId: number | null) => Driver | null;
}

/**
 * Builds the season-scoped `PredictionContext` for the current season.
 * Returns `null` when there is no current season.
 */
export async function createPredictionContext(
  supabase: SupabaseClient
): Promise<PredictionContext | null> {
  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  const seasonId = currentSeason?.id;
  if (!seasonId) return null;

  // Mapping: DB driver ID -> driver number (season-scoped)
  const { data: dbDrivers } = await supabase
    .from("drivers")
    .select("id, driver_number, is_active")
    .eq("season_id", seasonId);

  const driverIdToNumber = new Map<number, number>();
  const activeDriverNumbers = new Set<number>();
  for (const d of dbDrivers ?? []) {
    driverIdToNumber.set(d.id, d.driver_number);
    // `drivers.is_active` is NOT NULL DEFAULT TRUE, so treat anything other than
    // an explicit `false` as on the grid.
    if (d.is_active !== false) activeDriverNumbers.add(d.driver_number);
  }

  // Mapping: DB race ID -> meeting key (season-scoped)
  const { data: dbRaces } = await supabase
    .from("races")
    .select("id, meeting_key")
    .eq("season_id", seasonId);

  const raceIdToMeetingKey = new Map<number, number>();
  for (const r of dbRaces ?? []) {
    raceIdToMeetingKey.set(r.id, r.meeting_key);
  }

  // Full driver objects, matched by driver number. Two lists: the selectable
  // grid for the pickers, and the whole roster for resolving stored ids.
  const rosterDrivers = await fetchDrivers(supabase, { includeInactive: true });
  const allDrivers = rosterDrivers.filter((d) => activeDriverNumbers.has(d.driverNumber));

  function findDriver(dbDriverId: number | null): Driver | null {
    if (!dbDriverId) return null;
    const driverNumber = driverIdToNumber.get(dbDriverId);
    if (driverNumber === undefined) return null;
    return rosterDrivers.find((d) => d.driverNumber === driverNumber) ?? null;
  }

  return { seasonId, raceIdToMeetingKey, allDrivers, rosterDrivers, findDriver };
}

/**
 * Builds a 3-slot qualifying-top-3 `(Driver | null)[]` from the stored id
 * array, falling back to the legacy single pole column for rows that were
 * never backfilled.
 */
export function buildPredictedQualifyingTop3(
  qualifyingTop3Ids: (number | null)[] | null | undefined,
  legacyPoleId: number | null | undefined,
  findDriver: (dbDriverId: number | null) => Driver | null
): (Driver | null)[] {
  const ids: (number | null)[] =
    qualifyingTop3Ids && qualifyingTop3Ids.length > 0
      ? qualifyingTop3Ids
      : legacyPoleId != null
        ? [legacyPoleId]
        : [];
  return Array.from({ length: 3 }, (_, i) => findDriver(ids[i] ?? null));
}

/**
 * Fetches a user's race predictions for the current season and maps them to
 * one `FullRacePrediction` per passed-in race (keyed by `meetingKey`), with a
 * pending placeholder when the user has no stored prediction for a race.
 *
 * Resolves DB driver ids to full `Driver` objects via the season-scoped
 * driver-number mapping. When `qualifying_top_3` is empty/null it falls back
 * to the legacy single `pole_position_driver_id` column.
 *
 * The caller injects the Supabase client (and, optionally, a pre-built
 * `PredictionContext` so the season mappings are only queried once). Returns
 * `[]` when there is no current season.
 */
export async function fetchUserRacePredictions(
  supabase: SupabaseClient,
  userId: string,
  races: Race[],
  context?: PredictionContext | null
): Promise<FullRacePrediction[]> {
  const ctx = context ?? (await createPredictionContext(supabase));
  if (!ctx) return [];
  const { raceIdToMeetingKey, findDriver } = ctx;

  // Race prediction rows for the target user
  const { data: racePredRows } = await supabase
    .from("race_predictions")
    .select(
      "race_id, status, pole_position_driver_id, qualifying_top_3, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id, driver_of_the_day_driver_id, points_earned"
    )
    .eq("user_id", userId);

  const racePredByMeetingKey = new Map<number, RacePredictionRow>();
  for (const row of (racePredRows ?? []) as RacePredictionRow[]) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey !== undefined) {
      racePredByMeetingKey.set(meetingKey, row);
    }
  }

  return races.map((race) => {
    const row = racePredByMeetingKey.get(race.meetingKey);
    const top10Ids: (number | null)[] = row?.top_10 ?? [];
    return {
      raceId: race.meetingKey,
      userId,
      status: row?.status ?? "pending",
      qualifyingTop3: buildPredictedQualifyingTop3(
        row?.qualifying_top_3,
        row?.pole_position_driver_id,
        findDriver
      ),
      raceWinner: findDriver(top10Ids[0] ?? null),
      restOfTop10: Array.from({ length: 9 }, (_, i) => findDriver(top10Ids[i + 1] ?? null)),
      fastestLap: findDriver(row?.fastest_lap_driver_id ?? null),
      fastestPitStop: findDriver(row?.fastest_pit_stop_driver_id ?? null),
      driverOfTheDay: findDriver(row?.driver_of_the_day_driver_id ?? null),
      pointsEarned: row?.points_earned ?? null,
    };
  });
}

/**
 * Fetches a user's sprint predictions for the current season and maps them to
 * one `SprintPrediction` per passed-in race that has a sprint (keyed by
 * `meetingKey`), with a pending placeholder when the user has no stored
 * prediction for a sprint weekend.
 *
 * When `qualifying_top_3` is empty/null it falls back to the legacy single
 * `sprint_pole_driver_id` column. The caller injects the Supabase client
 * (and, optionally, a pre-built `PredictionContext`). Returns `[]` when there
 * is no current season.
 */
export async function fetchUserSprintPredictions(
  supabase: SupabaseClient,
  userId: string,
  races: Race[],
  context?: PredictionContext | null
): Promise<SprintPrediction[]> {
  const ctx = context ?? (await createPredictionContext(supabase));
  if (!ctx) return [];
  const { raceIdToMeetingKey, findDriver } = ctx;

  const { data: sprintPredRows } = await supabase
    .from("sprint_predictions")
    .select(
      "race_id, status, sprint_pole_driver_id, qualifying_top_3, top_8, fastest_lap_driver_id, points_earned"
    )
    .eq("user_id", userId);

  const sprintPredByMeetingKey = new Map<number, SprintPredictionRow>();
  for (const row of (sprintPredRows ?? []) as SprintPredictionRow[]) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey !== undefined) {
      sprintPredByMeetingKey.set(meetingKey, row);
    }
  }

  const sprintRaces = races.filter((r) => r.hasSprint);
  return sprintRaces.map((race) => {
    const row = sprintPredByMeetingKey.get(race.meetingKey);
    const top8Ids: (number | null)[] = row?.top_8 ?? [];
    return {
      raceId: race.meetingKey,
      userId,
      status: row?.status ?? "pending",
      qualifyingTop3: buildPredictedQualifyingTop3(
        row?.qualifying_top_3,
        row?.sprint_pole_driver_id,
        findDriver
      ),
      sprintWinner: findDriver(top8Ids[0] ?? null),
      restOfTop8: Array.from({ length: 7 }, (_, i) => findDriver(top8Ids[i + 1] ?? null)),
      fastestLap: findDriver(row?.fastest_lap_driver_id ?? null),
      pointsEarned: row?.points_earned ?? null,
    };
  });
}
