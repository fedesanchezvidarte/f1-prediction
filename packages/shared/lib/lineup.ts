import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Driver,
  LineupRosterEntry,
  RaceLineupEntry,
  RaceLineupOverride,
} from "../types";

/**
 * Per-race lineup overrides — the deviations from the season lineup recorded in
 * `race_lineup_overrides`.
 *
 * Two independent things live on one row:
 *  - `is_unavailable` — the driver is not on the grid for that race, so the
 *    prediction pickers show them greyed out and unselectable.
 *  - `team_id` — the driver races for a different team that race only, so the
 *    constructor (WCC) points from that race are attributed there instead of to
 *    `drivers.team_id`. Driver (WDC) points always stay with the driver.
 *
 * Nothing here touches prediction scoring: `scoring.ts` compares raw
 * `drivers.id` on both sides and never reads team data.
 */

/* ── Pure functions ─────────────────────────────────────────────────── */

/**
 * Folds one race's lineup overrides onto a driver list.
 *
 * A driver with a team override gets that team's name/colour/id (so their badge
 * reads the team they are actually racing for), and an unavailable driver gets
 * `isUnavailable: true`. Drivers without an override are returned untouched —
 * the same object reference, so callers can rely on referential equality where
 * they already do.
 *
 * Matched by `driverNumber`, the season-unique business key the UI keys on.
 * Pure function — no I/O.
 */
export function applyLineupOverrides(drivers: Driver[], lineup: RaceLineupEntry[]): Driver[] {
  if (lineup.length === 0) return drivers;

  const byDriverNumber = new Map<number, RaceLineupEntry>();
  for (const entry of lineup) {
    byDriverNumber.set(entry.driverNumber, entry);
  }

  return drivers.map((driver) => {
    const entry = byDriverNumber.get(driver.driverNumber);
    if (!entry) return driver;

    const teamOverride =
      entry.teamId != null && entry.teamName != null
        ? { teamId: entry.teamId, teamName: entry.teamName, teamColor: entry.teamColor ?? driver.teamColor }
        : null;

    // An entry that neither benches the driver nor moves them says nothing, so
    // return the original object and keep referential equality for React.
    if (!teamOverride && !entry.isUnavailable) return driver;

    return {
      ...driver,
      ...(teamOverride ?? {}),
      ...(entry.isUnavailable ? { isUnavailable: true } : {}),
    };
  });
}

/**
 * The driver numbers that are not on the grid for a race.
 *
 * Used by the submit route to reject a benched pick. The UI does not need this —
 * `applyLineupOverrides` already flags each driver with `isUnavailable`, and the
 * pickers read that flag off the driver object.
 * Pure function.
 */
export function getUnavailableDriverNumbers(lineup: RaceLineupEntry[]): number[] {
  return lineup.filter((entry) => entry.isUnavailable).map((entry) => entry.driverNumber);
}

/**
 * Builds the `(driverId, raceId) -> teamId` resolver used for constructor
 * standings: the override's team when one exists for that exact race, otherwise
 * the driver's season team.
 *
 * Returns `null` for a driver missing from `seasonTeamByDriverId` and with no
 * override, matching the existing "skip drivers with no team" behaviour in
 * `computeConstructorAggregates`.
 * Pure function.
 */
export function buildTeamAtRace(
  overrides: RaceLineupOverride[],
  seasonTeamByDriverId: Map<number, number | null>
): (driverId: number, raceId: number) => number | null {
  const overrideKey = (driverId: number, raceId: number) => `${raceId}:${driverId}`;

  const teamByKey = new Map<string, number>();
  for (const o of overrides) {
    if (o.teamId != null) {
      teamByKey.set(overrideKey(o.driverId, o.raceId), o.teamId);
    }
  }

  return (driverId, raceId) =>
    teamByKey.get(overrideKey(driverId, raceId)) ?? seasonTeamByDriverId.get(driverId) ?? null;
}

/* ── Service functions (caller injects the Supabase client) ─────────── */

interface LineupRow {
  race_id: number;
  driver_id: number;
  is_unavailable: boolean;
  team_id: number | null;
  note: string | null;
}

interface LineupRowWithJoins extends LineupRow {
  drivers: { driver_number: number } | { driver_number: number }[] | null;
  teams: { name: string; color: string } | { name: string; color: string }[] | null;
}

/** Supabase returns a joined row as an object (single FK) or a one-element array. */
function unwrap<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Rethrows a failed lineup query instead of returning an empty result.
 *
 * Returning `[]` on failure would make "the query broke" look exactly like
 * "this race has no overrides" — which silently un-benches a driver and sends
 * constructor points back to their season teams. The most likely cause is the
 * `race_lineup_overrides` migration not having been run, so failing loudly here
 * is what makes that visible. Callers that can tolerate missing overrides catch
 * this and say so at the call site.
 */
function assertLineupQueryOk(error: { message: string } | null, context: string): void {
  if (!error) return;
  throw new Error(`Failed to read race_lineup_overrides (${context}): ${error.message}`);
}

/**
 * Fetches the lineup overrides for a single race, resolved against `drivers`
 * and `teams` so the result can be folded straight onto a `Driver[]` via
 * `applyLineupOverrides`. Returns `[]` when the race has no overrides.
 */
/** The column list shared by the resolved-lineup fetchers. */
const LINEUP_WITH_JOINS_COLUMNS =
  "race_id, driver_id, is_unavailable, team_id, note, drivers(driver_number), teams(name, color)";

/** Maps resolved rows to entries, skipping any whose driver join is missing. */
function toLineupEntries(data: unknown): LineupRowWithJoins[] {
  return Array.isArray(data) ? (data as LineupRowWithJoins[]) : [];
}

function toLineupEntry(row: LineupRowWithJoins): RaceLineupEntry | null {
  const driver = unwrap(row.drivers);
  // An override whose driver row vanished is unusable — skip rather than guess.
  if (!driver) return null;
  const team = unwrap(row.teams);
  return {
    driverId: row.driver_id,
    driverNumber: driver.driver_number,
    isUnavailable: row.is_unavailable,
    teamId: row.team_id,
    teamName: team?.name ?? null,
    teamColor: team?.color ?? null,
    note: row.note,
  };
}

export async function fetchRaceLineup(
  supabase: SupabaseClient,
  raceId: number
): Promise<RaceLineupEntry[]> {
  const { data, error } = await supabase
    .from("race_lineup_overrides")
    .select(LINEUP_WITH_JOINS_COLUMNS)
    .eq("race_id", raceId);

  assertLineupQueryOk(error, `raceId=${raceId}`);

  const entries: RaceLineupEntry[] = [];
  for (const row of toLineupEntries(data)) {
    const entry = toLineupEntry(row);
    if (entry) entries.push(entry);
  }
  return entries;
}

/**
 * Fetches resolved lineup entries for many races at once, grouped by
 * `races.id`.
 *
 * The prediction page needs this rather than `fetchRaceLineup`: the round
 * switcher is client-side state with no server round-trip, so the page has to
 * hand the client every round's overrides up front. Otherwise arrowing to
 * another round would keep the first round's lineup and a benched driver would
 * become selectable again. Overrides are rare, so this stays a small payload.
 *
 * Races with no overrides are simply absent from the result.
 */
export async function fetchRaceLineups(
  supabase: SupabaseClient,
  raceIds: number[]
): Promise<Record<number, RaceLineupEntry[]>> {
  if (raceIds.length === 0) return {};

  const { data, error } = await supabase
    .from("race_lineup_overrides")
    .select(LINEUP_WITH_JOINS_COLUMNS)
    .in("race_id", raceIds);

  assertLineupQueryOk(error, `${raceIds.length} races`);

  const byRaceId: Record<number, RaceLineupEntry[]> = {};
  for (const row of toLineupEntries(data)) {
    const entry = toLineupEntry(row);
    if (!entry) continue;
    (byRaceId[row.race_id] ??= []).push(entry);
  }
  return byRaceId;
}

/**
 * Fetches every lineup override for the given races, in raw DB shape. Used by
 * the standings pipeline, which needs per-race team attribution across the
 * whole season rather than one race's picker state. Returns `[]` when there are
 * no races or no overrides.
 */
export async function fetchLineupOverrides(
  supabase: SupabaseClient,
  raceIds: number[]
): Promise<RaceLineupOverride[]> {
  if (raceIds.length === 0) return [];

  const { data, error } = await supabase
    .from("race_lineup_overrides")
    .select("race_id, driver_id, is_unavailable, team_id, note")
    .in("race_id", raceIds);

  assertLineupQueryOk(error, `${raceIds.length} races`);

  if (!Array.isArray(data)) return [];

  return (data as LineupRow[]).map((row) => ({
    raceId: row.race_id,
    driverId: row.driver_id,
    isUnavailable: row.is_unavailable,
    teamId: row.team_id,
    note: row.note,
  }));
}

/**
 * Fetches the full season roster together with whatever override applies to
 * `raceId`, for the admin Lineup panel. Includes inactive drivers — the panel is
 * where they get reactivated. Returns `[]` when there is no current season.
 */
export async function fetchLineupRoster(
  supabase: SupabaseClient,
  raceId: number
): Promise<LineupRosterEntry[]> {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return [];

  const [{ data: dbDrivers }, overrides] = await Promise.all([
    supabase
      .from("drivers")
      .select("id, driver_number, first_name, last_name, name_acronym, is_active, team_id, teams(name)")
      .eq("season_id", season.id)
      .order("last_name", { ascending: true }),
    fetchLineupOverrides(supabase, [raceId]),
  ]);

  const overrideByDriverId = new Map<number, RaceLineupOverride>();
  for (const o of overrides) {
    overrideByDriverId.set(o.driverId, o);
  }

  return (dbDrivers ?? []).map((d) => {
    const team = unwrap(d.teams as { name: string } | { name: string }[] | null);
    return {
      driverId: d.id as number,
      driverNumber: d.driver_number as number,
      firstName: d.first_name as string,
      lastName: d.last_name as string,
      nameAcronym: d.name_acronym as string,
      seasonTeamId: (d.team_id as number | null) ?? null,
      seasonTeamName: team?.name ?? "Unknown",
      isActive: Boolean(d.is_active),
      override: overrideByDriverId.get(d.id as number) ?? null,
    };
  });
}

/**
 * Creates or replaces the override for one (race, driver) pair.
 *
 * An override that neither benches the driver nor moves them to another team
 * says nothing, so it is deleted instead of stored — this is also what the DB
 * `race_lineup_overrides_not_empty` check enforces.
 *
 * Requires a client that can write the table (service role).
 */
export async function upsertLineupOverride(
  supabase: SupabaseClient,
  input: { raceId: number; driverId: number; isUnavailable: boolean; teamId: number | null; note: string | null }
): Promise<{ error: string | null; deleted: boolean }> {
  const { raceId, driverId, isUnavailable, teamId, note } = input;

  if (!isUnavailable && teamId == null) {
    const { error } = await deleteLineupOverride(supabase, raceId, driverId);
    return { error, deleted: error === null };
  }

  const { error } = await supabase
    .from("race_lineup_overrides")
    .upsert(
      {
        race_id: raceId,
        driver_id: driverId,
        is_unavailable: isUnavailable,
        team_id: teamId,
        note,
      },
      { onConflict: "race_id,driver_id" }
    );

  return { error: error?.message ?? null, deleted: false };
}

/** Removes the override for one (race, driver) pair. Requires a service-role client. */
export async function deleteLineupOverride(
  supabase: SupabaseClient,
  raceId: number,
  driverId: number
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("race_lineup_overrides")
    .delete()
    .eq("race_id", raceId)
    .eq("driver_id", driverId);

  return { error: error?.message ?? null };
}
