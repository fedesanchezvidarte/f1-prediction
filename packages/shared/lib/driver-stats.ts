type SupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

export interface DriverStats {
  driverId: number;
  wins: number;
  podiums: number;
  dnfs: number;
}

export interface DriverStatsMap {
  [driverId: number]: DriverStats;
}

export interface DriverStatsLeaders {
  mostWins: { driverId: number; count: number } | null;
  mostPodiums: { driverId: number; count: number } | null;
  mostDnfs: { driverId: number; count: number } | null;
}

/** Computes wins, podiums, DNFs per driver from an array of race results. Pure function — no I/O. */
export function computeDriverStats(
  results: { top_10: number[]; dnf_driver_ids: number[] | null }[]
): DriverStatsMap {
  const map: DriverStatsMap = {};

  function entry(driverId: number): DriverStats {
    if (!map[driverId]) {
      map[driverId] = { driverId, wins: 0, podiums: 0, dnfs: 0 };
    }
    return map[driverId];
  }

  for (const result of results) {
    const top10 = result.top_10 ?? [];
    if (top10.length > 0) {
      entry(top10[0]).wins += 1;
    }
    for (let i = 0; i < Math.min(3, top10.length); i++) {
      entry(top10[i]).podiums += 1;
    }
    const uniqueDnfs = new Set(result.dnf_driver_ids ?? []);
    for (const driverId of uniqueDnfs) {
      entry(driverId).dnfs += 1;
    }
  }

  return map;
}

/** Finds the leading driver for each stat category. Returns null for a category if no data exists. */
export function getStatsLeaders(stats: DriverStatsMap): DriverStatsLeaders {
  function leader(
    key: keyof Pick<DriverStats, "wins" | "podiums" | "dnfs">
  ): { driverId: number; count: number } | null {
    let best: { driverId: number; count: number } | null = null;
    for (const s of Object.values(stats)) {
      const count = s[key];
      if (count <= 0) continue;
      if (best === null || count > best.count || (count === best.count && s.driverId < best.driverId)) {
        best = { driverId: s.driverId, count };
      }
    }
    return best;
  }

  return {
    mostWins: leader("wins"),
    mostPodiums: leader("podiums"),
    mostDnfs: leader("dnfs"),
  };
}

/** Fetches all race results for the current season and computes driver stats. */
export async function fetchDriverStatsForSeason(
  supabase: SupabaseClient
): Promise<{ stats: DriverStatsMap; leaders: DriverStatsLeaders }> {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) {
    return { stats: {}, leaders: { mostWins: null, mostPodiums: null, mostDnfs: null } };
  }

  const { data: races } = await supabase
    .from("races")
    .select("id")
    .eq("season_id", season.id);

  const raceIds = (races ?? []).map((r: { id: number }) => r.id);
  if (raceIds.length === 0) {
    return { stats: {}, leaders: { mostWins: null, mostPodiums: null, mostDnfs: null } };
  }

  const { data: results } = await supabase
    .from("race_results")
    .select("top_10, dnf_driver_ids")
    .in("race_id", raceIds);

  const stats = computeDriverStats(
    (results ?? []) as { top_10: number[]; dnf_driver_ids: number[] | null }[]
  );
  const leaders = getStatsLeaders(stats);

  return { stats, leaders };
}
