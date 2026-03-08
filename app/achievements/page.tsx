import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AchievementsContent } from "@/components/achievements/AchievementsContent";
import { fetchAchievementsData } from "@/lib/achievements";
import { fetchUserProgressData } from "@/lib/achievement-calculator";
import type { Achievement } from "@/types";
import type { UserProgressCounts } from "@/lib/achievement-calculator";

function buildProgressMap(
  achievements: Achievement[],
  progress: UserProgressCounts
): Record<number, { current: number; max: number }> {
  const map: Record<number, { current: number; max: number }> = {};

  for (const ach of achievements) {
    const threshold = ach.threshold;
    let current: number | undefined;
    let max: number | undefined;

    switch (ach.slug) {
      case "first_prediction":
      case "10_predictions":
      case "20_predictions":
        current = progress.totalPredictions;
        max = threshold ?? undefined;
        break;
      case "all_2026_predictions":
        current = progress.completedSeasonRounds;
        max = progress.totalSeasonRounds;
        break;
      case "1_correct":
      case "10_correct":
      case "50_correct":
      case "100_correct":
        current = progress.totalCorrectPredictions;
        max = threshold ?? undefined;
        break;
      case "100_points":
      case "200_points":
      case "300_points":
        current = progress.totalPoints;
        max = threshold ?? undefined;
        break;
      case "race_prediction_winner":
      case "race_prediction_winner_10":
        current = progress.raceFirstCount;
        max = threshold ?? undefined;
        break;
      case "race_prediction_podium":
        current = progress.raceTop3Count;
        max = threshold ?? undefined;
        break;
      case "sprint_prediction_winner":
        current = progress.sprintFirstCount;
        max = threshold ?? undefined;
        break;
      case "sprint_prediction_podium":
        current = progress.sprintTop3Count;
        max = threshold ?? undefined;
        break;
      case "predict_1_team_best":
      case "predict_5_team_best":
      case "predict_10_team_best":
        current = progress.tbdCorrectCount;
        max = threshold ?? undefined;
        break;
    }

    if (current !== undefined && max !== undefined && max > 0) {
      map[ach.id] = { current, max };
    } else if (current === undefined && ach.threshold == null) {
      // Binary achievement (no threshold, boolean condition) — show 0 / 1 when locked
      map[ach.id] = { current: 0, max: 1 };
    }
  }

  return map;
}

export default async function AchievementsPage() {
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

  const [{ achievements, earnedIds }, progress] = await Promise.all([
    fetchAchievementsData(supabase, user.id),
    fetchUserProgressData(supabase, user.id),
  ]);

  const progressMap = buildProgressMap(achievements, progress);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} isAdmin={isAdminUser(user)} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <AchievementsContent
            achievements={achievements}
            earnedIds={earnedIds}
            progressMap={progressMap}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
