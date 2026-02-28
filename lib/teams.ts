import { createClient } from "@/lib/supabase/server";
import type { TeamWithDrivers } from "@/types";

/**
 * Fetches all team names from Supabase for the current season.
 */
export async function fetchTeamsFromDb(): Promise<string[]> {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return [];

  const { data: dbTeams } = await supabase
    .from("teams")
    .select("name")
    .eq("season_id", season.id)
    .order("name", { ascending: true });

  if (!dbTeams || dbTeams.length === 0) return [];

  return dbTeams.map((t) => t.name);
}

/**
 * Fetches all teams with their drivers for the current season.
 * Returns each team with its two drivers, useful for the team best driver prediction form.
 */
export async function fetchTeamsWithDrivers(): Promise<TeamWithDrivers[]> {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return [];

  const { data: dbTeams } = await supabase
    .from("teams")
    .select("id, name, color")
    .eq("season_id", season.id)
    .order("name", { ascending: true });

  if (!dbTeams || dbTeams.length === 0) return [];

  const { data: dbDrivers } = await supabase
    .from("drivers")
    .select("id, driver_number, first_name, last_name, name_acronym, team_id")
    .eq("season_id", season.id)
    .eq("is_active", true)
    .order("driver_number", { ascending: true });

  const driversByTeam = new Map<number, typeof dbDrivers>();
  for (const d of dbDrivers ?? []) {
    const existing = driversByTeam.get(d.team_id) ?? [];
    existing.push(d);
    driversByTeam.set(d.team_id, existing);
  }

  return dbTeams.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    drivers: (driversByTeam.get(team.id) ?? []).map((d) => ({
      id: d.id,
      driverNumber: d.driver_number,
      firstName: d.first_name,
      lastName: d.last_name,
      nameAcronym: d.name_acronym,
    })),
  }));
}
