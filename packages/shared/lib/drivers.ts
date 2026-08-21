import type { SupabaseClient } from "@supabase/supabase-js";
import type { Driver } from "../types";

export interface FetchDriversOptions {
  /**
   * Include drivers with `is_active = false`.
   *
   * Default `false` — the *selectable* grid, which is what every picker wants.
   * Pass `true` for the full season roster, needed whenever a stored driver id
   * has to be resolved back to a name: a driver deactivated mid-season still
   * appears in the predictions and results already recorded against them, and
   * dropping them there would blank out those rows.
   */
  includeInactive?: boolean;
}

/**
 * Fetches drivers (with their team info) from Supabase for the current season.
 * Active drivers only unless `includeInactive` is set. The caller injects the
 * Supabase client.
 */
export async function fetchDrivers(
  supabase: SupabaseClient,
  options: FetchDriversOptions = {}
): Promise<Driver[]> {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return [];

  let query = supabase
    .from("drivers")
    .select("driver_number, first_name, last_name, name_acronym, headshot_url, team_id, teams(name, color)")
    .eq("season_id", season.id);

  if (!options.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data: dbDrivers } = await query.order("last_name", { ascending: true });

  if (!dbDrivers || dbDrivers.length === 0) return [];

  return dbDrivers.map((d) => {
    // Supabase returns the joined row as an object (single FK) or array
    const team = Array.isArray(d.teams) ? d.teams[0] : d.teams;
    return {
      driverNumber: d.driver_number,
      firstName: d.first_name,
      lastName: d.last_name,
      nameAcronym: d.name_acronym,
      teamName: team?.name ?? "Unknown",
      teamColor: team?.color ?? "FFFFFF",
      teamId: d.team_id ?? undefined,
      headshotUrl: d.headshot_url ?? undefined,
    };
  });
}

/**
 * Sets a driver's season-wide availability (`drivers.is_active`).
 *
 * This is the blunt instrument: an inactive driver disappears from every picker
 * for the whole season. For a single weekend, record a per-race override via
 * `./lineup` instead. Requires a client that can write `drivers` (service role).
 */
export async function setDriverActive(
  supabase: SupabaseClient,
  driverId: number,
  isActive: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("drivers")
    .update({ is_active: isActive })
    .eq("id", driverId);

  return { error: error?.message ?? null };
}
