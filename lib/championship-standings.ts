import type {
  ChampionshipStandings,
  ConstructorStanding,
  Driver,
  DriverStanding,
  StatLeader,
} from "@/types";

type SupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

/** Official F1 race points by finishing position (P1..P10). */
export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;

/** Official F1 sprint points by finishing position (P1..P8). */
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

/** Length of the per-position finish-count vector used for countback tie-breaking (P1..P10). */
const COUNTBACK_LENGTH = RACE_POINTS.length;

export interface RaceResultRow {
  top_10: number[];
  dnf_driver_ids: number[] | null;
}

export interface SprintResultRow {
  top_8: number[];
}

/**
 * Driver lookup metadata used to project standings into renderable rows.
 * Keyed by driver primary-key id (drivers.id), NOT by driver_number.
 */
export interface DriverLookup {
  [driverId: number]: {
    driver: Driver;
    teamId: number | null;
  };
}

/**
 * Team lookup metadata used to project constructor standings.
 * Keyed by team primary-key id (teams.id).
 */
export interface TeamLookup {
  [teamId: number]: { name: string; color: string };
}

interface DriverAggregate {
  driverId: number;
  points: number;
  wins: number;
  podiums: number;
  raceFinishCounts: number[];
}

/**
 * Aggregates race + sprint results into per-driver totals using official F1 scoring:
 * race top-10 (25/18/15/12/10/8/6/4/2/1) and sprint top-8 (8/7/6/5/4/3/2/1). Pure function — no I/O.
 * Sprints contribute points only (no countback weight, no win/podium tally).
 */
export function computeDriverAggregates(
  raceResults: RaceResultRow[],
  sprintResults: SprintResultRow[]
): Map<number, DriverAggregate> {
  const map = new Map<number, DriverAggregate>();

  function entry(driverId: number): DriverAggregate {
    let existing = map.get(driverId);
    if (!existing) {
      existing = {
        driverId,
        points: 0,
        wins: 0,
        podiums: 0,
        raceFinishCounts: new Array(COUNTBACK_LENGTH).fill(0),
      };
      map.set(driverId, existing);
    }
    return existing;
  }

  for (const result of raceResults) {
    const top10 = result.top_10 ?? [];
    for (let i = 0; i < Math.min(RACE_POINTS.length, top10.length); i++) {
      const driverId = top10[i];
      const agg = entry(driverId);
      agg.points += RACE_POINTS[i];
      agg.raceFinishCounts[i] += 1;
      if (i === 0) agg.wins += 1;
      if (i < 3) agg.podiums += 1;
    }
  }

  for (const result of sprintResults) {
    const top8 = result.top_8 ?? [];
    for (let i = 0; i < Math.min(SPRINT_POINTS.length, top8.length); i++) {
      entry(top8[i]).points += SPRINT_POINTS[i];
    }
  }

  return map;
}

/**
 * Compares two driver aggregates for standings ordering.
 *  1. Higher points wins.
 *  2. Tiebreak: countback on race finishes (more P1s, then more P2s, ..., then more P10s).
 *  3. Final fallback: ascending driverId for deterministic ordering.
 */
function compareDriverAggregates(a: DriverAggregate, b: DriverAggregate): number {
  if (b.points !== a.points) return b.points - a.points;
  for (let i = 0; i < COUNTBACK_LENGTH; i++) {
    const av = a.raceFinishCounts[i] ?? 0;
    const bv = b.raceFinishCounts[i] ?? 0;
    if (bv !== av) return bv - av;
  }
  return a.driverId - b.driverId;
}

/**
 * Projects driver aggregates into ranked DriverStanding rows.
 * Every driver present in the lookup appears in the output, even those with
 * zero points or zero results — F1 standings show the entire grid. Drivers
 * missing from the aggregates Map get a zero-everything default.
 * Pure function.
 */
export function buildDriverStandings(
  aggregates: Map<number, DriverAggregate>,
  lookup: DriverLookup
): DriverStanding[] {
  const items: DriverAggregate[] = [];
  for (const driverIdStr of Object.keys(lookup)) {
    const driverId = Number(driverIdStr);
    const existing = aggregates.get(driverId);
    items.push(
      existing ?? {
        driverId,
        points: 0,
        wins: 0,
        podiums: 0,
        raceFinishCounts: new Array(COUNTBACK_LENGTH).fill(0),
      }
    );
  }

  items.sort(compareDriverAggregates);

  return items.map((agg, index) => ({
    rank: index + 1,
    driverId: agg.driverId,
    driver: lookup[agg.driverId].driver,
    points: agg.points,
    wins: agg.wins,
    podiums: agg.podiums,
    raceFinishCounts: [...agg.raceFinishCounts],
  }));
}

interface ConstructorAggregate {
  teamId: number;
  points: number;
  wins: number;
  podiums: number;
  raceFinishCounts: number[];
}

/**
 * Aggregates driver standings into constructor standings by summing each driver's
 * points/wins/podiums/raceFinishCounts into their team. Every team in the lookup
 * appears in the output, even those without any scoring drivers.
 *
 * Tie-breaking follows F1's official rules:
 *  1. Higher points wins.
 *  2. Countback: the team with more P1 finishes wins, then P2s, then P3s, ...
 *     (raceFinishCounts is the per-position sum across both team drivers).
 *  3. Final fallback: ascending teamId for deterministic ordering.
 *
 * Pure function.
 */
export function buildConstructorStandings(
  driverStandings: DriverStanding[],
  driverLookup: DriverLookup,
  teamLookup: TeamLookup
): ConstructorStanding[] {
  const map = new Map<number, ConstructorAggregate>();

  for (const teamIdStr of Object.keys(teamLookup)) {
    const teamId = Number(teamIdStr);
    map.set(teamId, {
      teamId,
      points: 0,
      wins: 0,
      podiums: 0,
      raceFinishCounts: new Array(COUNTBACK_LENGTH).fill(0),
    });
  }

  for (const ds of driverStandings) {
    const teamId = driverLookup[ds.driverId]?.teamId;
    if (teamId == null) continue;
    const existing = map.get(teamId);
    if (!existing) continue;

    existing.points += ds.points;
    existing.wins += ds.wins;
    existing.podiums += ds.podiums;
    for (let i = 0; i < COUNTBACK_LENGTH; i++) {
      existing.raceFinishCounts[i] += ds.raceFinishCounts[i] ?? 0;
    }
  }

  const items = Array.from(map.values());

  items.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    for (let i = 0; i < COUNTBACK_LENGTH; i++) {
      const av = a.raceFinishCounts[i] ?? 0;
      const bv = b.raceFinishCounts[i] ?? 0;
      if (bv !== av) return bv - av;
    }
    return a.teamId - b.teamId;
  });

  return items.map((item, index) => ({
    rank: index + 1,
    teamId: item.teamId,
    teamName: teamLookup[item.teamId].name,
    teamColor: teamLookup[item.teamId].color,
    points: item.points,
    wins: item.wins,
    podiums: item.podiums,
    raceFinishCounts: [...item.raceFinishCounts],
  }));
}

/**
 * Projects a stat-leader { driverId, count } pair into a StatLeader with driver metadata.
 * Returns null if the leader is null or its driver is missing from the lookup.
 */
export function projectStatLeader(
  leader: { driverId: number; count: number } | null,
  lookup: DriverLookup
): StatLeader | null {
  if (!leader) return null;
  const entry = lookup[leader.driverId];
  if (!entry) return null;
  return { driverId: leader.driverId, driver: entry.driver, count: leader.count };
}

/**
 * Fetches the championship standings for the current season.
 *
 * Aggregates official F1 points from race_results + sprint_results, ranks drivers
 * with countback tie-breaking, sums into constructor totals, and computes the
 * stat leaders (most wins / most podiums / most DNFs) using the same shape as
 * the existing driver-stats service.
 */
export async function fetchChampionshipStandings(
  supabase: SupabaseClient
): Promise<ChampionshipStandings> {
  const empty: ChampionshipStandings = {
    wdc: [],
    wcc: [],
    stats: { mostWins: null, mostPodiums: null, mostDnfs: null },
  };

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return empty;

  const seasonId = season.id as number;

  const [{ data: races }, { data: dbDrivers }, { data: dbTeams }] = await Promise.all([
    supabase.from("races").select("id").eq("season_id", seasonId),
    supabase
      .from("drivers")
      .select(
        "id, driver_number, first_name, last_name, name_acronym, headshot_url, team_id, teams(name, color)"
      )
      .eq("season_id", seasonId),
    supabase.from("teams").select("id, name, color").eq("season_id", seasonId),
  ]);

  const raceIds = (races ?? []).map((r: { id: number }) => r.id);
  if (raceIds.length === 0) return empty;

  const driverLookup: DriverLookup = {};
  for (const d of dbDrivers ?? []) {
    const team = Array.isArray(d.teams) ? d.teams[0] : d.teams;
    driverLookup[d.id as number] = {
      driver: {
        driverNumber: d.driver_number,
        firstName: d.first_name,
        lastName: d.last_name,
        nameAcronym: d.name_acronym,
        teamName: team?.name ?? "Unknown",
        teamColor: team?.color ?? "FFFFFF",
        teamId: d.team_id ?? undefined,
        headshotUrl: d.headshot_url ?? undefined,
      },
      teamId: d.team_id ?? null,
    };
  }

  const teamLookup: TeamLookup = {};
  for (const t of dbTeams ?? []) {
    teamLookup[t.id as number] = { name: t.name, color: t.color };
  }

  const [{ data: raceResults }, { data: sprintResults }] = await Promise.all([
    supabase
      .from("race_results")
      .select("top_10, dnf_driver_ids")
      .in("race_id", raceIds),
    supabase.from("sprint_results").select("top_8").in("race_id", raceIds),
  ]);

  const raceRows = (raceResults ?? []) as RaceResultRow[];
  const sprintRows = (sprintResults ?? []) as SprintResultRow[];

  const aggregates = computeDriverAggregates(raceRows, sprintRows);
  const wdc = buildDriverStandings(aggregates, driverLookup);
  const wcc = buildConstructorStandings(wdc, driverLookup, teamLookup);

  // Stats: reuse driver-stats library for parity with Champion-prediction scoring.
  const { computeDriverStats, getStatsLeaders } = await import("@/lib/driver-stats");
  const statsMap = computeDriverStats(raceRows);
  const leaders = getStatsLeaders(statsMap);

  return {
    wdc,
    wcc,
    stats: {
      mostWins: projectStatLeader(leaders.mostWins, driverLookup),
      mostPodiums: projectStatLeader(leaders.mostPodiums, driverLookup),
      mostDnfs: projectStatLeader(leaders.mostDnfs, driverLookup),
    },
  };
}
