import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  AchievementsCard,
  LeaderboardCard,
  NextRaceCountdown,
  NoUpcomingRaces,
  PlaceholderCard,
  PointSystemCard,
  PredictionsCard,
  UserPointsCard,
} from "@/components/dashboard";
import {
  RACES_2026,
  getNextRace,
  getPredictionCardRaces,
} from "@/lib/dummy-data";
import { fetchAchievementsData } from "@/lib/achievements";
import type { UserStats, LeaderboardEntry, RacePrediction } from "@/types";

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

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName = profileRow?.display_name ?? fallbackName;
  const avatarUrl = profileRow?.avatar_url ?? fallbackAvatar;

  const { data: leaderboardRow } = await supabase
    .from("leaderboard")
    .select("total_points, rank, predictions_count, best_race_points, perfect_podiums")
    .eq("user_id", user.id)
    .single();

  const { data: racePredictions } = await supabase
    .from("race_predictions")
    .select("race_id, status, points_earned")
    .eq("user_id", user.id);

  // Build mapping: DB race ID -> meeting key
  const { data: dbRaces } = await supabase
    .from("races")
    .select("id, meeting_key")
    .eq("season_id", 1);

  const raceIdToMeetingKey = new Map<number, number>();
  for (const r of dbRaces ?? []) {
    raceIdToMeetingKey.set(r.id, r.meeting_key);
  }

  // All profiles = every registered user (source of truth for total count + leaderboard)
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  const { data: leaderboardRows } = await supabase
    .from("leaderboard")
    .select("user_id, total_points, predictions_count");

  const leaderboardMap = new Map(
    (leaderboardRows ?? []).map((r) => [r.user_id, r])
  );

  const totalUsers = (allProfiles ?? []).length;

  // Build full ranked list (mirrors leaderboard page logic)
  type RankedEntry = LeaderboardEntry & { _points: number };
  const unsorted: RankedEntry[] = (allProfiles ?? []).map((p) => {
    const lb = leaderboardMap.get(p.id);
    return {
      rank: 0,
      userId: p.id,
      displayName: p.display_name ?? "Driver",
      totalPoints: lb?.total_points ?? 0,
      predictionsCount: lb?.predictions_count ?? 0,
      _points: lb?.total_points ?? 0,
    };
  });

  unsorted.sort((a, b) =>
    b._points !== a._points
      ? b._points - a._points
      : a.displayName.localeCompare(b.displayName)
  );

  // Assign shared ranks then take top 10
  const allRanked: LeaderboardEntry[] = unsorted.reduce<LeaderboardEntry[]>((acc, e, i) => {
    const rank = i === 0 || e._points < unsorted[i - 1]._points ? i + 1 : acc[i - 1].rank;
    acc.push({ rank, userId: e.userId, displayName: e.displayName, totalPoints: e.totalPoints, predictionsCount: e.predictionsCount });
    return acc;
  }, []);

  const leaderboard = allRanked.slice(0, 10);

  // Current user's rank from the full ranked list
  const currentUserRank = allRanked.find((e) => e.userId === user.id)?.rank ?? 0;

  const userStats: UserStats = {
    totalPoints: leaderboardRow?.total_points ?? 0,
    rank: currentUserRank,
    totalUsers,
    predictionsSubmitted: leaderboardRow?.predictions_count ?? 0,
    perfectPodiums: leaderboardRow?.perfect_podiums ?? 0,
    bestRacePoints: leaderboardRow?.best_race_points ?? 0,
  };

  const predictions: RacePrediction[] = RACES_2026.map((race) => {
    const pred = (racePredictions ?? []).find((p) => {
      const meetingKey = raceIdToMeetingKey.get(p.race_id);
      return meetingKey === race.meetingKey;
    });
    return {
      raceId: race.meetingKey,
      raceName: race.raceName,
      round: race.round,
      status: (pred?.status as RacePrediction["status"]) ?? "pending",
      top10: [],
      pointsEarned: pred?.points_earned ?? undefined,
      maxPoints: 42,
    };
  });

  const { achievements, earnedIds: earnedAchievementIds } = await fetchAchievementsData(supabase, user.id);

  const nextRace = getNextRace();
  const predictionCardRaces = getPredictionCardRaces();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {/* Bento Grid */}
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3">
              {/* Row 1 */}
              {/* User Points - spans 2 cols */}
              <div className="border-b border-border sm:col-span-2 sm:border-r">
                <UserPointsCard stats={userStats} />
              </div>
              {/* Next Race Countdown - spans 1 col */}
              <div className="border-b border-border">
                {nextRace ? (
                  <NextRaceCountdown race={nextRace} />
                ) : (
                  <NoUpcomingRaces />
                )}
              </div>

              {/* Row 2 */}
              {/* Predictions - spans 1 col */}
              <div className="border-b border-border sm:border-r">
                <PredictionsCard
                  predictions={predictions}
                  races={predictionCardRaces}
                />
              </div>
              {/* Leaderboard - spans 2 cols */}
              <div className="border-b border-border sm:col-span-2">
                <LeaderboardCard entries={leaderboard} currentUserId={user.id} />
              </div>

              {/* Row 3 */}
              {/* Point System */}
              <div className="sm:border-r">
                <PointSystemCard />
              </div>
              {/* Achievements */}
              <div className="border-t border-border sm:border-r sm:border-t-0">
                <AchievementsCard
                  earned={earnedAchievementIds}
                  achievements={achievements}
                  total={achievements.length}
                />
              </div>
              {/* Placeholder */}
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
