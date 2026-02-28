import type { SupabaseClient } from "@supabase/supabase-js";
import type { LucideIcon } from "lucide-react";
import {
  Flag, ClipboardList, BookMarked, CalendarCheck,
  Target, Crosshair, Eye, Telescope,
  Star, Gem, Sparkles,
  Trophy, Medal, Zap, Wrench, Heart,
  Award, Layers, Gauge, Timer, Rocket, TrendingUp, LayoutGrid,
  Wand2, Crown, PartyPopper,
  Swords, Shield, Anvil, Flame, BadgeCheck,
  Car, Users, Network,
} from "lucide-react";
import type { Achievement, AchievementCategory } from "@/types";

export const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  // Predictions
  first_prediction: Flag,
  "10_predictions": ClipboardList,
  "20_predictions": BookMarked,
  all_2026_predictions: CalendarCheck,
  // Accuracy
  "1_correct": Target,
  "10_correct": Crosshair,
  "50_correct": Eye,
  "100_correct": Telescope,
  predict_race_winner: Trophy,
  predict_pole: Medal,
  predict_fastest_lap: Zap,
  predict_fastest_pit: Wrench,
  fans_choice: Heart,
  sprint_winner: Gauge,
  sprint_pole: Timer,
  sprint_fastest_lap: Rocket,
  // Milestones
  "100_points": Star,
  "200_points": Gem,
  "300_points": Sparkles,
  race_prediction_winner_10: Shield,
  predict_5_team_best: Users,
  predict_10_team_best: Network,
  // Special
  perfect_podium: Award,
  perfect_top_10: Layers,
  sprint_podium: TrendingUp,
  perfect_top_8: LayoutGrid,
  hat_trick: Wand2,
  predict_wdc: Crown,
  predict_wcc: PartyPopper,
  race_prediction_winner: Swords,
  race_prediction_podium: Anvil,
  sprint_prediction_winner: Flame,
  sprint_prediction_podium: BadgeCheck,
  predict_1_team_best: Car,
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

export function getAchievementIcon(slug: string): LucideIcon {
  return ACHIEVEMENT_ICONS[slug] ?? Trophy;
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
 * Explicit display order for achievements.
 * Slugs not listed here will appear at the end in their DB id order.
 */
const ACHIEVEMENT_SORT_ORDER: string[] = [
  // Predictions
  "first_prediction",
  "10_predictions",
  "20_predictions",
  "all_2026_predictions",
  // Accuracy — general
  "1_correct",
  "10_correct",
  "50_correct",
  "100_correct",
  // Accuracy — race
  "predict_race_winner",
  "predict_pole",
  "predict_fastest_lap",
  "predict_fastest_pit",
  "fans_choice",
  // Accuracy — sprint
  "sprint_winner",
  "sprint_pole",
  "sprint_fastest_lap",
  // Special — race
  "perfect_podium",
  "perfect_top_10",
  "hat_trick",
  "race_prediction_winner",
  "race_prediction_podium",
  // Special — sprint
  "sprint_podium",
  "perfect_top_8",
  "sprint_prediction_winner",
  "sprint_prediction_podium",
  // Special — champion
  "predict_wdc",
  "predict_wcc",
  "predict_1_team_best",
  // Milestones — points
  "100_points",
  "200_points",
  "300_points",
  // Milestones — competitive
  "race_prediction_winner_10",
  "predict_5_team_best",
  "predict_10_team_best",
];

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

  const achievements: Achievement[] = (allAchievements ?? [])
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      iconUrl: a.icon_url,
      category: a.category as AchievementCategory,
      threshold: a.threshold,
      createdAt: a.created_at,
    }))
    .sort((a, b) => {
      const ai = ACHIEVEMENT_SORT_ORDER.indexOf(a.slug);
      const bi = ACHIEVEMENT_SORT_ORDER.indexOf(b.slug);
      const aOrder = ai === -1 ? Infinity : ai;
      const bOrder = bi === -1 ? Infinity : bi;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.id - b.id; // stable fallback for unlisted slugs
    });

  const earnedIds = (userAchievements ?? []).map(
    (ua) => ua.achievement_id as number
  );

  return { achievements, earnedIds };
}


