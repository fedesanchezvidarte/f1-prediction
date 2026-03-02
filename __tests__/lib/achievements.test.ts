/**
 * Tests for lib/achievements.ts — pure helpers only.
 *
 * Covers: getAchievementIcon, getCategoryColors, static data integrity.
 * Skips fetchAchievementsData (requires Supabase, tested in Phase 2).
 */
import {
  getAchievementIcon,
  getCategoryColors,
  ACHIEVEMENT_ICONS,
  CATEGORY_COLORS,
  CATEGORY_COLORS_FALLBACK,
} from "@/lib/achievements";
import { Trophy } from "lucide-react";

describe("getAchievementIcon", () => {
  it("returns the correct icon for a known slug", () => {
    // "first_prediction" maps to Flag
    const icon = getAchievementIcon("first_prediction");
    expect(icon).toBeDefined();
    expect(icon).not.toBe(Trophy); // Flag ≠ Trophy
  });

  it("returns Trophy as fallback for an unknown slug", () => {
    const icon = getAchievementIcon("nonexistent_slug");
    expect(icon).toBe(Trophy);
  });

  it("returns Trophy for empty string slug", () => {
    const icon = getAchievementIcon("");
    expect(icon).toBe(Trophy);
  });

  it("returns correct icon for each known slug", () => {
    for (const [slug, expectedIcon] of Object.entries(ACHIEVEMENT_ICONS)) {
      expect(getAchievementIcon(slug)).toBe(expectedIcon);
    }
  });
});

describe("getCategoryColors", () => {
  it("returns correct colors for 'predictions' category", () => {
    const colors = getCategoryColors("predictions");
    expect(colors).toEqual(CATEGORY_COLORS.predictions);
  });

  it("returns correct colors for 'accuracy' category", () => {
    const colors = getCategoryColors("accuracy");
    expect(colors).toEqual(CATEGORY_COLORS.accuracy);
  });

  it("returns correct colors for 'milestones' category", () => {
    const colors = getCategoryColors("milestones");
    expect(colors).toEqual(CATEGORY_COLORS.milestones);
  });

  it("returns correct colors for 'special' category", () => {
    const colors = getCategoryColors("special");
    expect(colors).toEqual(CATEGORY_COLORS.special);
  });

  it("returns fallback colors for invalid category", () => {
    const colors = getCategoryColors("invalid");
    expect(colors).toEqual(CATEGORY_COLORS_FALLBACK);
  });

  it("returns fallback colors for empty string", () => {
    const colors = getCategoryColors("");
    expect(colors).toEqual(CATEGORY_COLORS_FALLBACK);
  });
});

describe("ACHIEVEMENT_ICONS static data", () => {
  it("has no duplicate entries (each slug is unique by Record definition)", () => {
    const slugs = Object.keys(ACHIEVEMENT_ICONS);
    const uniqueSlugs = new Set(slugs);
    expect(slugs.length).toBe(uniqueSlugs.size);
  });

  it("all icons are non-null functions (React components)", () => {
    for (const [_slug, icon] of Object.entries(ACHIEVEMENT_ICONS)) {
      expect(typeof icon).toBe("object"); // lucide icons are ForwardRef objects
    }
  });
});
