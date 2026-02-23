import type { User } from "@supabase/supabase-js";

/**
 * Checks whether a Supabase user has admin access.
 * Admin access is granted via:
 * - `app_metadata.role === "admin"` (set via Supabase dashboard/SQL)
 * - User ID listed in the `ADMIN_USER_IDS` env variable (comma-separated)
 */
export function isAdminUser(user: User | null): boolean {
  if (!user) return false;
  if (user.app_metadata?.role === "admin") return true;
  if (process.env.ADMIN_USER_IDS?.split(",").includes(user.id)) return true;
  return false;
}
