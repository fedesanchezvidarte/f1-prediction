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

// Portable achievement logic lives in the shared package; this module adds the
// web-only icon mapping (lucide-react renders DOM) and re-exports the rest so
// existing `@/lib/achievements` imports keep working.
export {
  CATEGORY_COLORS,
  CATEGORY_COLORS_FALLBACK,
  CATEGORY_LABELS,
  getCategoryColors,
  fetchAchievementsData,
} from "@f1/shared/lib/achievements";

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

export function getAchievementIcon(slug: string): LucideIcon {
  return ACHIEVEMENT_ICONS[slug] ?? Trophy;
}
