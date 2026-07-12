import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "../types";

/**
 * Auth-derived fallback values applied when the profile row is missing a
 * field. The caller derives these from its auth user (web: `user_metadata`
 * on the server-side user; mobile: the session user) so shared code never
 * depends on an auth User object.
 */
export interface ProfileFallbacks {
  displayName?: string;
  avatarUrl?: string | null;
  email?: string;
  createdAt?: string;
}

/** Aggregate stats shown on the profile page. */
export interface ProfileStats {
  totalPoints: number;
  rank: number | null;
  predictionsCount: number;
  achievementsCount: number;
}

/** Everything the profile page needs. */
export interface ProfileData {
  profile: Profile;
  stats: ProfileStats;
}

/**
 * Fetches and assembles the profile page data for one user: the profile row,
 * the user's leaderboard totals (points, rank, predictions count), and their
 * unlocked-achievements count. Missing profile fields fall back to the
 * auth-derived `fallbacks`; missing stats fall back to zero / null rank.
 * The caller injects the Supabase client.
 */
export async function fetchProfileData(
  supabase: SupabaseClient,
  userId: string,
  fallbacks: ProfileFallbacks = {}
): Promise<ProfileData> {
  const [{ data: profileRow }, { data: leaderboardRow }, { count: achievementsCount }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase
        .from("leaderboard")
        .select("total_points, rank, predictions_count")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("user_achievements")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  const profile: Profile = {
    id: userId,
    displayName: profileRow?.display_name ?? fallbacks.displayName ?? "Driver",
    email: profileRow?.email ?? fallbacks.email ?? "",
    avatarUrl: profileRow?.avatar_url ?? fallbacks.avatarUrl ?? null,
    countryCode: profileRow?.country_code ?? null,
    createdAt: profileRow?.created_at ?? fallbacks.createdAt ?? "",
  };

  const stats: ProfileStats = {
    totalPoints: leaderboardRow?.total_points ?? 0,
    rank: leaderboardRow?.rank ?? null,
    predictionsCount: leaderboardRow?.predictions_count ?? 0,
    achievementsCount: achievementsCount ?? 0,
  };

  return { profile, stats };
}
