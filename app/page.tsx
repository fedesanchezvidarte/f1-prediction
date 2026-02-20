import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { UserPointsCard } from "@/components/dashboard/UserPointsCard";
import { NextRaceCountdown } from "@/components/dashboard/NextRaceCountdown";
import { PredictionsCard } from "@/components/dashboard/PredictionsCard";
import { LeaderboardCard } from "@/components/dashboard/LeaderboardCard";
import { PointSystemCard } from "@/components/dashboard/PointSystemCard";
import { PlaceholderCard } from "@/components/dashboard/PlaceholderCard";
import {
  DUMMY_USER_STATS,
  DUMMY_LEADERBOARD,
  DUMMY_PREDICTIONS,
  getNextRace,
} from "@/lib/dummy-data";

export default async function Home() {
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

  const nextRace = getNextRace();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {/* Bento Grid */}
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3">
              {/* Row 1 */}
              {/* User Points - spans 2 cols */}
              <div className="border-b border-border sm:col-span-2 sm:border-r">
                <UserPointsCard stats={DUMMY_USER_STATS} />
              </div>
              {/* Next Race Countdown - spans 1 col */}
              <div className="border-b border-border">
                {nextRace ? (
                  <NextRaceCountdown race={nextRace} />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
                    No upcoming races
                  </div>
                )}
              </div>

              {/* Row 2 */}
              {/* Predictions - spans 1 col */}
              <div className="border-b border-border sm:border-r">
                <PredictionsCard predictions={DUMMY_PREDICTIONS} />
              </div>
              {/* Leaderboard - spans 2 cols */}
              <div className="border-b border-border sm:col-span-2">
                <LeaderboardCard entries={DUMMY_LEADERBOARD} />
              </div>

              {/* Row 3 */}
              {/* Point System */}
              <div className="sm:border-r">
                <PointSystemCard />
              </div>
              {/* Placeholders */}
              <div className="border-t border-border sm:border-r sm:border-t-0">
                <PlaceholderCard />
              </div>
              <div className="border-t border-border sm:border-t-0">
                <PlaceholderCard />
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
