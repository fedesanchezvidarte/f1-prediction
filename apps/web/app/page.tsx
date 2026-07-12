import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@f1/shared/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  LeaderboardCard,
  NewPointsSystemBanner,
  NextRaceCountdown,
  NoUpcomingRaces,
  PlaceholderCard,
  PointSystemCard,
  RaceCalendarCard,
  StandingsCard,
  UserSummaryCard,
} from "@/components/dashboard";
import { fetchRacesFromDb } from "@/lib/races";
import { fetchDashboardData } from "@f1/shared/lib/dashboard";
import { fetchAchievementsData } from "@/lib/achievements";
import { fetchChampionshipStandings } from "@f1/shared/lib/championship-standings";

export default async function Home() {
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

  // Fetch races with live DB datetimes, then assemble the dashboard from shared logic
  const races = await fetchRacesFromDb();
  const { profile, userStats, leaderboard, calendarEntries, nextRace } =
    await fetchDashboardData(supabase, user.id, races);

  const displayName = profile.displayName ?? fallbackName;
  const avatarUrl = profile.avatarUrl ?? fallbackAvatar;

  const { achievements, earnedIds: earnedAchievementIds } = await fetchAchievementsData(supabase, user.id);

  const championshipStandings = await fetchChampionshipStandings(supabase);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} isAdmin={isAdminUser(user)} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {/* New Points System announcement */}
          <NewPointsSystemBanner />

          {/* Bento Grid */}
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <div className="grid grid-cols-1 sm:grid-cols-6">
              {/* Row 1 */}
              {/* User Summary - spans 3 cols */}
              <div className="border-b border-border sm:col-span-3 sm:border-r">
                <UserSummaryCard
                  stats={userStats}
                  earned={earnedAchievementIds}
                  achievements={achievements}
                  total={achievements.length}
                />
              </div>
              {/* Next Race Countdown - spans 3 cols */}
              <div className="border-b border-border sm:col-span-3">
                {nextRace ? (
                  <NextRaceCountdown race={nextRace} />
                ) : (
                  <NoUpcomingRaces />
                )}
              </div>

              {/* Row 2 */}
              {/* Championship Standings - spans 2 cols */}
              <div className="border-b border-border sm:col-span-2 sm:border-r">
                <StandingsCard standings={championshipStandings} />
              </div>
              {/* Leaderboard - spans 4 cols */}
              <div className="border-b border-border sm:col-span-4">
                <LeaderboardCard entries={leaderboard} currentUserId={user.id} />
              </div>

              {/* Row 3 */}
              {/* Point System */}
              <div className="border-border sm:col-span-2 sm:border-r">
                <PointSystemCard />
              </div>
              {/* Race Calendar */}
              <div className="border-t border-border sm:col-span-2 sm:border-r sm:border-t-0">
                <RaceCalendarCard entries={calendarEntries} />
              </div>
              {/* Placeholder */}
              <div className="border-t border-border sm:col-span-2 sm:border-t-0">
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
