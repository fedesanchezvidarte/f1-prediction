import { createClient } from "@/lib/supabase/server";
import { fetchTeams, fetchTeamsWithDrivers as fetchTeamsWithDriversShared } from "@f1/shared/lib/teams";
import type { TeamWithDrivers } from "@f1/shared/types";

/**
 * Web wrappers: inject the Next.js server Supabase client into the shared
 * team fetchers so Server Component call sites stay unchanged.
 */
export async function fetchTeamsFromDb(): Promise<string[]> {
  const supabase = await createClient();
  return fetchTeams(supabase);
}

export async function fetchTeamsWithDrivers(): Promise<TeamWithDrivers[]> {
  const supabase = await createClient();
  return fetchTeamsWithDriversShared(supabase);
}
