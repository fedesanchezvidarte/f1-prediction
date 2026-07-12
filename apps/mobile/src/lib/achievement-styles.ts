import type { AchievementCategory } from "@f1/shared/types";

export interface CategoryStyle {
  /** NativeWind class for tinted icon/badge backgrounds. */
  bgClass: string;
  /** NativeWind class for tinted text. */
  textClass: string;
  /** Hex color for Ionicons `color` props (icons can't take classes). */
  hex: string;
}

/**
 * Mobile counterpart of the shared CATEGORY_COLORS
 * (@f1/shared/lib/achievements). The shared map holds Tailwind class strings,
 * but NativeWind only compiles classes it finds inside apps/mobile/src (see
 * tailwind.config.js `content`), so the literals must live here. Same f1-*
 * palette mapping as the web: predictions=blue, accuracy=green,
 * milestones=amber, special=purple.
 */
export const CATEGORY_STYLES: Record<AchievementCategory, CategoryStyle> = {
  predictions: { bgClass: "bg-f1-blue/10", textClass: "text-f1-blue", hex: "#3C91E6" },
  accuracy: { bgClass: "bg-f1-green/10", textClass: "text-f1-green", hex: "#44AF69" },
  milestones: { bgClass: "bg-f1-amber/10", textClass: "text-f1-amber", hex: "#FFB100" },
  special: { bgClass: "bg-f1-purple/10", textClass: "text-f1-purple", hex: "#A06CD5" },
};

const CATEGORY_STYLE_FALLBACK: CategoryStyle = {
  bgClass: "bg-f1-white/10",
  textClass: "text-f1-white/50",
  hex: "#F7F7F780",
};

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category as AchievementCategory] ?? CATEGORY_STYLE_FALLBACK;
}
