import type { SupabaseClient } from "@supabase/supabase-js";
import type { Driver, RaceResult, SprintResult } from "../types";
import { createPredictionContext, type PredictionContext } from "./predictions";

/**
 * Builds a qualifying-top-3 result `Driver[]` from the stored id array,
 * falling back to the legacy single pole column for rows that were never
 * backfilled. Unlike the prediction variant, unresolved slots are dropped
 * (results only contain real drivers).
 */
export function buildResultQualifyingTop3(
  qualifyingTop3Ids: (number | null)[] | null | undefined,
  legacyPoleId: number | null | undefined,
  findDriver: (dbDriverId: number | null) => Driver | null
): Driver[] {
  const ids: (number | null)[] =
    qualifyingTop3Ids && qualifyingTop3Ids.length > 0
      ? qualifyingTop3Ids
      : legacyPoleId != null
        ? [legacyPoleId]
        : [];
  return ids.map((id) => findDriver(id ?? null)).filter((d): d is Driver => d !== null);
}

/**
 * Fetches every race result for the current season, keyed by `meetingKey`.
 * Rows missing the required fields (non-empty top 10, a Q1 driver and a
 * fastest lap) are skipped — a result is only shown once it is complete.
 *
 * The caller injects the Supabase client (and, optionally, a pre-built
 * `PredictionContext`). Returns `{}` when there is no current season.
 */
export async function fetchRaceResults(
  supabase: SupabaseClient,
  context?: PredictionContext | null
): Promise<Record<number, RaceResult>> {
  const ctx = context ?? (await createPredictionContext(supabase));
  if (!ctx) return {};
  const { raceIdToMeetingKey, findDriver } = ctx;

  const { data: raceResultRows } = await supabase
    .from("race_results")
    .select(
      "race_id, pole_position_driver_id, qualifying_top_3, qualifying_p4_driver_id, top_10, p11_driver_id, fastest_lap_driver_id, fastest_pit_stop_driver_id, driver_of_the_day_driver_id"
    );

  const raceResults: Record<number, RaceResult> = {};
  for (const row of raceResultRows ?? []) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey === undefined) continue;

    const top10Ids: number[] = row.top_10 ?? [];
    const top10 = top10Ids.map((id) => findDriver(id)).filter((d): d is Driver => d !== null);
    const qualifyingTop3 = buildResultQualifyingTop3(
      row.qualifying_top_3,
      row.pole_position_driver_id,
      findDriver
    );
    const qualifyingP4 = findDriver(row.qualifying_p4_driver_id ?? null);
    const p11 = findDriver(row.p11_driver_id ?? null);
    const fastestLap = findDriver(row.fastest_lap_driver_id);
    const fastestPit = findDriver(row.fastest_pit_stop_driver_id);
    const driverOfTheDay = findDriver(row.driver_of_the_day_driver_id);
    if (top10.length > 0 && qualifyingTop3[0] && fastestLap) {
      raceResults[meetingKey] = {
        raceId: meetingKey,
        qualifyingTop3,
        raceWinner: top10[0],
        top10,
        fastestLap,
        ...(qualifyingP4 ? { qualifyingP4 } : {}),
        ...(p11 ? { p11 } : {}),
        ...(fastestPit ? { fastestPitStop: fastestPit } : {}),
        ...(driverOfTheDay ? { driverOfTheDay } : {}),
      };
    }
  }

  return raceResults;
}

/**
 * Fetches every sprint result for the current season, keyed by `meetingKey`.
 * Rows missing the required fields (non-empty top 8, a Q1 driver and a
 * fastest lap) are skipped.
 *
 * The caller injects the Supabase client (and, optionally, a pre-built
 * `PredictionContext`). Returns `{}` when there is no current season.
 */
export async function fetchSprintResults(
  supabase: SupabaseClient,
  context?: PredictionContext | null
): Promise<Record<number, SprintResult>> {
  const ctx = context ?? (await createPredictionContext(supabase));
  if (!ctx) return {};
  const { raceIdToMeetingKey, findDriver } = ctx;

  const { data: sprintResultRows } = await supabase
    .from("sprint_results")
    .select(
      "race_id, sprint_pole_driver_id, qualifying_top_3, qualifying_p4_driver_id, top_8, p9_driver_id, fastest_lap_driver_id"
    );

  const sprintResults: Record<number, SprintResult> = {};
  for (const row of sprintResultRows ?? []) {
    const meetingKey = raceIdToMeetingKey.get(row.race_id);
    if (meetingKey === undefined) continue;

    const top8Ids: number[] = row.top_8 ?? [];
    const top8 = top8Ids.map((id) => findDriver(id)).filter((d): d is Driver => d !== null);
    const qualifyingTop3 = buildResultQualifyingTop3(
      row.qualifying_top_3,
      row.sprint_pole_driver_id,
      findDriver
    );
    const qualifyingP4 = findDriver(row.qualifying_p4_driver_id ?? null);
    const p9 = findDriver(row.p9_driver_id ?? null);
    const fastestLap = findDriver(row.fastest_lap_driver_id);
    if (top8.length > 0 && qualifyingTop3[0] && fastestLap) {
      sprintResults[meetingKey] = {
        raceId: meetingKey,
        qualifyingTop3,
        sprintWinner: top8[0],
        top8,
        fastestLap,
        ...(qualifyingP4 ? { qualifyingP4 } : {}),
        ...(p9 ? { p9 } : {}),
      };
    }
  }

  return sprintResults;
}
