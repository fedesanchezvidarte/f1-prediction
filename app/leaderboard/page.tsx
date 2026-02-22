import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LeaderboardContent } from "@/components/leaderboard/LeaderboardContent";
import { RACES_2026 } from "@/lib/dummy-data";
import type { DetailedLeaderboardEntry } from "@/types";

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

  // Fetch every registered user — this is the source of truth for "all players"
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .order("display_name", { ascending: true });

  // Fetch leaderboard rows (only exist for users who have scored predictions)
  const { data: leaderboardRows } = await supabase
    .from("leaderboard")
    .select("user_id, total_points, predictions_count");

  const leaderboardMap = new Map(
    (leaderboardRows ?? []).map((r) => [r.user_id, r])
  );

  // Build mapping: DB race ID -> meeting key
  const { data: dbRaces } = await supabase
    .from("races")
    .select("id, meeting_key")
    .eq("season_id", 1);

  const raceIdToMeetingKey = new Map<number, number>();
  for (const r of dbRaces ?? []) {
    raceIdToMeetingKey.set(r.id, r.meeting_key);
  }

  // Fetch scored race predictions for all users (for the detailed per-race view)
  const { data: racePreds } = await supabase
    .from("race_predictions")
    .select("user_id, race_id, points_earned")
    .eq("status", "scored");

  const racePointsMap: Record<string, Record<number, number | null>> = {};
  for (const pred of racePreds ?? []) {
    const meetingKey = raceIdToMeetingKey.get(pred.race_id);
    if (meetingKey === undefined) continue;
    if (!racePointsMap[pred.user_id]) racePointsMap[pred.user_id] = {};
    racePointsMap[pred.user_id][meetingKey] = pred.points_earned ?? null;
  }

  // Also include sprint prediction points in the per-race breakdown
  const { data: sprintPreds } = await supabase
    .from("sprint_predictions")
    .select("user_id, race_id, points_earned")
    .eq("status", "scored");

  for (const pred of sprintPreds ?? []) {
    const meetingKey = raceIdToMeetingKey.get(pred.race_id);
    if (meetingKey === undefined) continue;
    if (!racePointsMap[pred.user_id]) racePointsMap[pred.user_id] = {};
    const existing = racePointsMap[pred.user_id][meetingKey] ?? 0;
    racePointsMap[pred.user_id][meetingKey] = existing + (pred.points_earned ?? 0);
  }

  const raceKeys = RACES_2026.map((r) => r.meetingKey);

  // Build entries for every profile, defaulting to 0 pts for users with no leaderboard row
  const unsorted: Omit<DetailedLeaderboardEntry, "rank">[] = (allProfiles ?? []).map((p) => {
    const lb = leaderboardMap.get(p.id);
    const racePoints: Record<number, number | null> = {};
    for (const key of raceKeys) {
      racePoints[key] = racePointsMap[p.id]?.[key] ?? null;
    }
    return {
      userId: p.id,
      displayName: p.display_name ?? "Driver",
      totalPoints: lb?.total_points ?? 0,
      predictionsCount: lb?.predictions_count ?? 0,
      racePoints,
    };
  });

  // Sort: highest points first; ties broken alphabetically by display name
  unsorted.sort((a, b) =>
    b.totalPoints !== a.totalPoints
      ? b.totalPoints - a.totalPoints
      : a.displayName.localeCompare(b.displayName)
  );

  // Assign ranks (shared rank for tied points)
  const entries: DetailedLeaderboardEntry[] = [];
  let currentRank = 1;
  for (let i = 0; i < unsorted.length; i++) {
    if (i > 0 && unsorted[i].totalPoints < unsorted[i - 1].totalPoints) {
      currentRank = i + 1;
    }
    entries.push({ ...unsorted[i], rank: currentRank });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <LeaderboardContent
            entries={entries}
            races={RACES_2026}
            currentUserId={user.id}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
