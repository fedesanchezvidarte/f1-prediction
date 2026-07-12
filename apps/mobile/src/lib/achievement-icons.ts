import type { Ionicons } from "@expo/vector-icons";

export type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * Mobile counterpart of the web's lucide icon map
 * (apps/web/lib/achievements.ts ACHIEVEMENT_ICONS). Maps the same 33
 * achievement slugs to semantically close Ionicons names, since lucide-react
 * renders DOM and cannot be used in React Native.
 */
export const ACHIEVEMENT_ICON_NAMES: Record<string, IoniconName> = {
  // Predictions
  first_prediction: "flag", // web: Flag
  "10_predictions": "clipboard", // web: ClipboardList
  "20_predictions": "bookmark", // web: BookMarked
  all_2026_predictions: "calendar-number", // web: CalendarCheck
  // Accuracy
  "1_correct": "locate", // web: Target
  "10_correct": "scan", // web: Crosshair
  "50_correct": "eye", // web: Eye
  "100_correct": "telescope", // web: Telescope
  predict_race_winner: "trophy", // web: Trophy
  predict_pole: "medal", // web: Medal
  predict_fastest_lap: "flash", // web: Zap
  predict_fastest_pit: "build", // web: Wrench
  fans_choice: "heart", // web: Heart
  sprint_winner: "speedometer", // web: Gauge
  sprint_pole: "timer", // web: Timer
  sprint_fastest_lap: "rocket", // web: Rocket
  // Milestones
  "100_points": "star", // web: Star
  "200_points": "diamond", // web: Gem
  "300_points": "sparkles", // web: Sparkles
  race_prediction_winner_10: "shield", // web: Shield
  predict_5_team_best: "people", // web: Users
  predict_10_team_best: "git-network", // web: Network
  // Special
  perfect_podium: "ribbon", // web: Award
  perfect_top_10: "layers", // web: Layers
  sprint_podium: "trending-up", // web: TrendingUp
  perfect_top_8: "grid", // web: LayoutGrid
  hat_trick: "color-wand", // web: Wand2
  predict_wdc: "planet", // web: Crown (Ionicons has no crown; world champion → planet)
  predict_wcc: "balloon", // web: PartyPopper
  race_prediction_winner: "podium", // web: Swords (no swords in Ionicons)
  race_prediction_podium: "hammer", // web: Anvil
  sprint_prediction_winner: "flame", // web: Flame
  sprint_prediction_podium: "checkmark-circle", // web: BadgeCheck
  predict_1_team_best: "car-sport", // web: Car
};

/** Ionicons name for an achievement slug; falls back to the trophy. */
export function getAchievementIconName(slug: string): IoniconName {
  return ACHIEVEMENT_ICON_NAMES[slug] ?? "trophy";
}
