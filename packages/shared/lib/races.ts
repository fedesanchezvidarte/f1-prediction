import type { SupabaseClient } from "@supabase/supabase-js";
import type { Race } from "../types";

/**
 * Fetches ALL race data from the Supabase `races` table for the current season.
 * No hardcoded fallback — the database is the single source of truth.
 * The caller injects the Supabase client.
 */
export async function fetchRaces(supabase: SupabaseClient): Promise<Race[]> {
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) return [];

  const { data: dbRaces } = await supabase
    .from("races")
    .select(
      "meeting_key, race_name, official_name, circuit_short_name, country_name, country_code, location, date_start, date_end, sprint_date_end, round, has_sprint"
    )
    .eq("season_id", season.id)
    .order("round", { ascending: true });

  if (!dbRaces || dbRaces.length === 0) return [];

  return dbRaces.map((r) => ({
    meetingKey: r.meeting_key,
    raceName: r.race_name,
    officialName: r.official_name ?? r.race_name,
    circuitShortName: r.circuit_short_name,
    countryName: r.country_name,
    countryCode: r.country_code ?? "",
    location: r.location,
    dateStart: r.date_start,
    dateEnd: r.date_end,
    sprintDateEnd: r.sprint_date_end ?? null,
    round: r.round,
    hasSprint: r.has_sprint,
  }));
}
