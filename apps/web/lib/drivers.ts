import { createClient } from "@/lib/supabase/server";
import { fetchDrivers } from "@f1/shared/lib/drivers";
import type { Driver } from "@f1/shared/types";

/**
 * Web wrapper: injects the Next.js server Supabase client into the shared
 * driver fetcher so Server Component call sites stay unchanged.
 */
export async function fetchDriversFromDb(): Promise<Driver[]> {
  const supabase = await createClient();
  return fetchDrivers(supabase);
}
