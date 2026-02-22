import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileContent } from "@/components/profile/ProfileContent";
import type { Profile } from "@/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Driver";
  const avatarUrl = user.user_metadata?.avatar_url;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: leaderboardRow } = await supabase
    .from("leaderboard")
    .select("total_points, rank, predictions_count")
    .eq("user_id", user.id)
    .single();

  const { count: achievementsCount } = await supabase
    .from("user_achievements")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const profile: Profile = {
    id: user.id,
    displayName: profileRow?.display_name ?? displayName,
    email: profileRow?.email ?? user.email ?? "",
    avatarUrl: profileRow?.avatar_url ?? avatarUrl ?? null,
    countryCode: profileRow?.country_code ?? null,
    createdAt: profileRow?.created_at ?? user.created_at,
  };

  const stats = {
    totalPoints: leaderboardRow?.total_points ?? 0,
    rank: leaderboardRow?.rank ?? null as number | null,
    predictionsCount: leaderboardRow?.predictions_count ?? 0,
    achievementsCount: achievementsCount ?? 0,
  };

  const authProvider = user.app_metadata?.provider ?? "email";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={profile.displayName} avatarUrl={profile.avatarUrl ?? undefined} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <ProfileContent
            profile={profile}
            stats={stats}
            authProvider={authProvider}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
