import { createClient } from "@/lib/supabase/server";
import { fetchRaces } from "@f1/shared/lib/races";
import type { Race } from "@f1/shared/types";

// Re-export pure utility functions so existing server-side imports still work
export { getRaceStatus, getNextRace, getPredictionCardRaces } from "@f1/shared/lib/race-utils";

/**
 * Web wrapper: injects the Next.js server Supabase client into the shared
 * race fetcher so Server Component call sites stay unchanged.
 */
export async function fetchRacesFromDb(): Promise<Race[]> {
  const supabase = await createClient();
  return fetchRaces(supabase);
}
