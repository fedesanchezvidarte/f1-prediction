import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LeaderboardContent } from "@/components/leaderboard/LeaderboardContent";
import { DETAILED_LEADERBOARD, RACES_2026 } from "@/lib/dummy-data";

export default async function LeaderboardPage() {
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <LeaderboardContent
            entries={DETAILED_LEADERBOARD}
            races={RACES_2026}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
