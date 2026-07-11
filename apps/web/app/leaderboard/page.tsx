import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@f1/shared/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LeaderboardContent } from "@/components/leaderboard/LeaderboardContent";
import { fetchRacesFromDb } from "@/lib/races";
import { fetchDetailedLeaderboard } from "@f1/shared/lib/leaderboard";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fallbackName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Driver";
  const fallbackAvatar = user.user_metadata?.avatar_url;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName = profileRow?.display_name ?? fallbackName;
  const avatarUrl = profileRow?.avatar_url ?? fallbackAvatar;

  // Fetch races with live DB datetimes, then assemble the ranked leaderboard
  // (shared with the mobile app) using the same Supabase client.
  const races = await fetchRacesFromDb();
  const entries = await fetchDetailedLeaderboard(supabase, races);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} isAdmin={isAdminUser(user)} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <LeaderboardContent
            entries={entries}
            races={races}
            currentUserId={user.id}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
