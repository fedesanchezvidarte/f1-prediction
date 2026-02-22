import type { SupabaseClient } from "@supabase/supabase-js";
import type { Achievement, AchievementCategory } from "@/types";

export const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_prediction: "🏁",
  "10_predictions": "🏁",
  "20_predictions": "🏁",
  all_2026_predictions: "🏁",
  "1_correct": "🎯",
  "10_correct": "🎯",
  "50_correct": "🎯",
  "100_correct": "🎯",
  "100_points": "⭐",
  "200_points": "⭐",
  "300_points": "⭐",
  predict_race_winner: "🏆",
  predict_pole: "🥇",
  predict_fastest_lap: "⚡",
  predict_fastest_pit: "🔧",
  perfect_podium: "🏅",
  perfect_top_10: "🔮",
  sprint_winner: "💨",
  sprint_pole: "💨",
  sprint_fastest_lap: "💨",
  sprint_podium: "💨",
  perfect_top_8: "💨",
  hat_trick: "🎩",
  predict_wdc: "👑",
  predict_wcc: "🏗️",
};

export const CATEGORY_COLORS: Record<AchievementCategory, { bg: string; text: string; border: string }> = {
  predictions: { bg: "bg-f1-blue/10", text: "text-f1-blue", border: "border-f1-blue/20" },
  accuracy: { bg: "bg-f1-green/10", text: "text-f1-green", border: "border-f1-green/20" },
  milestones: { bg: "bg-f1-amber/10", text: "text-f1-amber", border: "border-f1-amber/20" },
  special: { bg: "bg-f1-purple/10", text: "text-f1-purple", border: "border-f1-purple/20" },
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  predictions: "Predictions",
  accuracy: "Accuracy",
  milestones: "Milestones",
  special: "Special",
};

export function getAchievementIcon(slug: string): string {
  return ACHIEVEMENT_ICONS[slug] ?? "🏆";
}

export const CATEGORY_COLORS_FALLBACK = {
  bg: "bg-card",
  text: "text-muted",
  border: "border-border",
};

export function getCategoryColors(category: string) {
  return (
    CATEGORY_COLORS[category as AchievementCategory] ?? CATEGORY_COLORS_FALLBACK
  );
}

/**
 * Fetches all achievements and the current user's earned achievement IDs in
 * parallel. Reuse this in any server component that needs both.
 */
export async function fetchAchievementsData(
  supabase: SupabaseClient,
  userId: string
): Promise<{ achievements: Achievement[]; earnedIds: number[] }> {
  const [{ data: allAchievements }, { data: userAchievements }] =
    await Promise.all([
      supabase
        .from("achievements")
        .select("*")
        .order("id", { ascending: true }),
      supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", userId),
    ]);

  const achievements: Achievement[] = (allAchievements ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    description: a.description,
    iconUrl: a.icon_url,
    category: a.category as AchievementCategory,
    threshold: a.threshold,
    createdAt: a.created_at,
  }));

  const earnedIds = (userAchievements ?? []).map(
    (ua) => ua.achievement_id as number
  );

  return { achievements, earnedIds };
}

/**
 * Tiered achievements share the same base icon but get a color upgrade.
 * Bronze → Silver → Gold based on threshold progression.
 */
export function getTierColor(slug: string): string {
  if (slug.startsWith("100_") || slug === "first_prediction" || slug === "1_correct")
    return "from-amber-700 to-amber-900";
  if (slug.startsWith("200_") || slug === "10_predictions" || slug === "10_correct")
    return "from-slate-300 to-slate-500";
  if (slug.startsWith("300_") || slug === "20_predictions" || slug === "50_correct" || slug === "100_correct" || slug === "all_2026_predictions")
    return "from-yellow-300 to-yellow-500";
  return "from-zinc-400 to-zinc-600";
}
