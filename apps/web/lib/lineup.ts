import { createClient } from "@/lib/supabase/server";
import { fetchRaceLineup, fetchRaceLineups } from "@f1/shared/lib/lineup";
import type { RaceLineupEntry } from "@f1/shared/types";

// Re-export the pure helpers so Server Component call sites can fold the lineup
// onto a driver list without reaching into packages/shared directly.
export { applyLineupOverrides, getUnavailableDriverNumbers } from "@f1/shared/lib/lineup";

/**
 * Web wrapper: injects the Next.js server Supabase client into the shared
 * per-race lineup fetcher so Server Component call sites stay unchanged.
 *
 * `raceId` is the `races.id` DB id — not the OpenF1 `meeting_key` the
 * prediction UI keys on.
 */
export async function fetchRaceLineupFromDb(raceId: number): Promise<RaceLineupEntry[]> {
  const supabase = await createClient();
  return fetchRaceLineup(supabase, raceId);
}

/**
 * Web wrapper for the whole-season lineup fetch, grouped by `races.id`.
 * Used by the prediction page, which must hand the client every round's
 * overrides because the round switcher never returns to the server.
 */
export async function fetchRaceLineupsFromDb(
  raceIds: number[]
): Promise<Record<number, RaceLineupEntry[]>> {
  const supabase = await createClient();
  return fetchRaceLineups(supabase, raceIds);
}
