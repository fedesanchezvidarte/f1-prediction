import { useQuery } from "@tanstack/react-query";
import { fetchRaceLineups } from "@f1/shared/lib/lineup";
import type { RaceLineupEntry } from "@f1/shared/types";

import { supabase } from "@/lib/supabase";

/** Per-race lineup overrides keyed by `meetingKey`, the id the UI works in. */
export type LineupByMeetingKey = Record<number, RaceLineupEntry[]>;

/**
 * Every round's overrides in one fetch, re-keyed from `races.id` to
 * `meetingKey`.
 *
 * The whole season is fetched rather than just the visible round because the
 * round switcher on the prediction screen is local state: fetching per round
 * would leave the previous round's overrides applied after arrowing to another
 * one, and a benched driver would become pickable again. Overrides are rare, so
 * the payload stays small.
 *
 * The `races.id -> meeting_key` map is read straight from `races`, because
 * `Race` (from `fetchRaces`) carries only the meeting key. Deliberately not via
 * `createPredictionContext`, which would also pull the full driver roster —
 * two extra round trips this hook has no use for.
 */
async function fetchLineupByMeetingKey(): Promise<LineupByMeetingKey> {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return {};

  const { data: races, error } = await supabase
    .from("races")
    .select("id, meeting_key")
    .eq("season_id", season.id);

  if (error) throw new Error(`Failed to read races: ${error.message}`);
  if (!races || races.length === 0) return {};

  const meetingKeyByRaceId = new Map<number, number>(
    races.map((r: { id: number; meeting_key: number }) => [r.id, r.meeting_key])
  );

  const byRaceId = await fetchRaceLineups(supabase, [...meetingKeyByRaceId.keys()]);

  const byMeetingKey: LineupByMeetingKey = {};
  for (const [raceId, entries] of Object.entries(byRaceId)) {
    const meetingKey = meetingKeyByRaceId.get(Number(raceId));
    if (meetingKey !== undefined) byMeetingKey[meetingKey] = entries;
  }
  return byMeetingKey;
}

/**
 * Season-wide lineup overrides for the prediction screen, cached under
 * ["raceLineups"].
 *
 * `fetchRaceLineups` deliberately throws instead of failing open, but a broken
 * overrides read must not take the prediction screen down with it — so the
 * rejection is swallowed here and logged, and the pickers fall back to the
 * season grid. That is safe because the server-side guard in
 * `/api/predictions/submit` still refuses a benched pick, so a stale grid can
 * never turn into a saved bad prediction. Swallowing inside the query function
 * (rather than reading `error` at the call site) also keeps React Query from
 * retrying a failure the screen has already recovered from.
 */
export function useRaceLineupsQuery() {
  return useQuery({
    queryKey: ["raceLineups"],
    queryFn: () =>
      fetchLineupByMeetingKey().catch((err: unknown) => {
        console.error("[race-prediction] Could not read race lineup overrides:", err);
        return {} as LineupByMeetingKey;
      }),
  });
}
