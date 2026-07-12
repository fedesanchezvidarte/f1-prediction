import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { fetchProfileData } from "@f1/shared/lib/profile";
import type { ProfileFallbacks } from "@f1/shared/lib/profile";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Auth-derived fallbacks applied when the profile row is missing a field —
 * the same derivation the web profile page uses (`user_metadata`).
 */
export function profileFallbacks(user: User | null): ProfileFallbacks {
  return {
    displayName: user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Driver",
    avatarUrl: user?.user_metadata?.avatar_url ?? null,
    email: user?.email,
    createdAt: user?.created_at,
  };
}

/**
 * Profile row + aggregate stats for the signed-in user, cached under
 * ["profile", userId] so the tab-header avatar button and the Profile modal
 * share one fetch. Invalidate this key after avatar/name updates.
 */
export function useProfileQuery() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfileData(supabase, userId!, profileFallbacks(user)),
    enabled: Boolean(userId),
  });
}
