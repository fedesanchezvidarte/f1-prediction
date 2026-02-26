import { createClient } from "@/lib/supabase/server";
import type { Driver } from "@/types";

/**
 * Fetches all active drivers (with their team info) from Supabase
 * for the current season.
 */
export async function fetchDriversFromDb(): Promise<Driver[]> {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return [];

  const { data: dbDrivers } = await supabase
    .from("drivers")
    .select("driver_number, first_name, last_name, name_acronym, headshot_url, team_id, teams(name, color)")
    .eq("season_id", season.id)
    .eq("is_active", true)
    .order("driver_number", { ascending: true });

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
      headshotUrl: d.headshot_url ?? undefined,
    };
  });
}
