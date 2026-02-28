import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client using the service_role key.
 * This client bypasses RLS and protective triggers, so it should only
 * be used in trusted server-side contexts (e.g. scoring, admin operations)
 * after verifying the caller is an admin.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
