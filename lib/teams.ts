import { createClient } from "@/lib/supabase/server";

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
