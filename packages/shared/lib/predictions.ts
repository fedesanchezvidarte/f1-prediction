import type { SupabaseClient } from "@supabase/supabase-js";
import type { Driver, FullRacePrediction, PredictionStatus, Race } from "../types";
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

/**
 * Fetches a user's race predictions for the current season and maps them to
 * one `FullRacePrediction` per passed-in race (keyed by `meetingKey`), with a
 * pending placeholder when the user has no stored prediction for a race.
 *
 * Resolves DB driver ids to full `Driver` objects via the season-scoped
 * driver-number mapping. When `qualifying_top_3` is empty/null it falls back
 * to the legacy single `pole_position_driver_id` column.
 *
 * The caller injects the Supabase client. Returns `[]` when there is no
 * current season.
 */
export async function fetchUserRacePredictions(
  supabase: SupabaseClient,
  userId: string,
  races: Race[]
): Promise<FullRacePrediction[]> {
  const { data: currentSeason } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  const seasonId = currentSeason?.id;
  if (!seasonId) return [];

  // Mapping: DB driver ID -> driver number (season-scoped)
  const { data: dbDrivers } = await supabase
    .from("drivers")
    .select("id, driver_number")
    .eq("season_id", seasonId);

  const driverIdToNumber = new Map<number, number>();
  for (const d of dbDrivers ?? []) {
    driverIdToNumber.set(d.id, d.driver_number);
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

  // Full driver objects, matched by driver number
  const allDrivers = await fetchDrivers(supabase);

  function findDriver(dbDriverId: number | null): Driver | null {
    if (!dbDriverId) return null;
    const driverNumber = driverIdToNumber.get(dbDriverId);
    if (driverNumber === undefined) return null;
    return allDrivers.find((d) => d.driverNumber === driverNumber) ?? null;
  }

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

  // Build a 3-slot qualifying-top-3 (Driver | null)[] from the stored array,
  // falling back to the legacy single pole column for not-yet-backfilled rows.
  function buildQualifyingTop3(
    qualifyingTop3Ids: (number | null)[] | null | undefined,
    legacyPoleId: number | null | undefined
  ): (Driver | null)[] {
    const ids: (number | null)[] =
      qualifyingTop3Ids && qualifyingTop3Ids.length > 0
        ? qualifyingTop3Ids
        : legacyPoleId != null
          ? [legacyPoleId]
          : [];
    return Array.from({ length: 3 }, (_, i) => findDriver(ids[i] ?? null));
  }

  return races.map((race) => {
    const row = racePredByMeetingKey.get(race.meetingKey);
    const top10Ids: (number | null)[] = row?.top_10 ?? [];
    return {
      raceId: race.meetingKey,
      userId,
      status: row?.status ?? "pending",
      qualifyingTop3: buildQualifyingTop3(row?.qualifying_top_3, row?.pole_position_driver_id),
      raceWinner: findDriver(top10Ids[0] ?? null),
      restOfTop10: Array.from({ length: 9 }, (_, i) => findDriver(top10Ids[i + 1] ?? null)),
      fastestLap: findDriver(row?.fastest_lap_driver_id ?? null),
      fastestPitStop: findDriver(row?.fastest_pit_stop_driver_id ?? null),
      driverOfTheDay: findDriver(row?.driver_of_the_day_driver_id ?? null),
      pointsEarned: row?.points_earned ?? null,
    };
  });
}
