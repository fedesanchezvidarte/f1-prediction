/**
 * Tests for lib/achievements.ts — pure helpers + fetchAchievementsData.
 *
 * Covers: getAchievementIcon, getCategoryColors, static data integrity,
 *         fetchAchievementsData with mocked Supabase.
 */
import {
  getAchievementIcon,
  getCategoryColors,
  fetchAchievementsData,
  ACHIEVEMENT_ICONS,
  CATEGORY_COLORS,
  CATEGORY_COLORS_FALLBACK,
} from "@/lib/achievements";
import { Trophy } from "lucide-react";
import { createMockSupabase } from "../helpers/mockSupabase";

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

/* ════════════════════════════════════════════════════════════════════ */
/*  fetchAchievementsData — Supabase integration via mock              */
/* ════════════════════════════════════════════════════════════════════ */

describe("fetchAchievementsData", () => {
  it("returns empty arrays when DB has no achievements", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", { data: [], error: null });
    mockTable("user_achievements", { data: [], error: null });

    const result = await fetchAchievementsData(supabase, "user-1");
    expect(result.achievements).toEqual([]);
    expect(result.earnedIds).toEqual([]);
  });

  it("returns empty arrays when both queries return null", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", { data: null, error: null });
    mockTable("user_achievements", { data: null, error: null });

    const result = await fetchAchievementsData(supabase, "user-1");
    expect(result.achievements).toEqual([]);
    expect(result.earnedIds).toEqual([]);
  });

  it("maps DB rows to Achievement type correctly", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", {
      data: [
        {
          id: 1,
          slug: "first_prediction",
          name: "First Prediction",
          description: "Make your first prediction",
          icon_url: null,
          category: "predictions",
          threshold: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
      ],
      error: null,
    });
    mockTable("user_achievements", { data: [], error: null });

    const { achievements } = await fetchAchievementsData(supabase, "user-1");
    expect(achievements).toHaveLength(1);
    expect(achievements[0]).toEqual({
      id: 1,
      slug: "first_prediction",
      name: "First Prediction",
      description: "Make your first prediction",
      iconUrl: null,
      category: "predictions",
      threshold: 1,
      createdAt: "2025-01-01T00:00:00Z",
    });
  });

  it("sorts achievements by ACHIEVEMENT_SORT_ORDER", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", {
      data: [
        { id: 3, slug: "100_points", name: "100 Points", description: "", icon_url: null, category: "milestones", threshold: 100, created_at: "" },
        { id: 2, slug: "1_correct", name: "1 Correct", description: "", icon_url: null, category: "accuracy", threshold: 1, created_at: "" },
        { id: 1, slug: "first_prediction", name: "First", description: "", icon_url: null, category: "predictions", threshold: 1, created_at: "" },
      ],
      error: null,
    });
    mockTable("user_achievements", { data: [], error: null });

    const { achievements } = await fetchAchievementsData(supabase, "user-1");
    expect(achievements.map((a) => a.slug)).toEqual([
      "first_prediction",
      "1_correct",
      "100_points",
    ]);
  });

  it("places unlisted slugs at the end sorted by id", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", {
      data: [
        { id: 99, slug: "unknown_b", name: "B", description: "", icon_url: null, category: "special", threshold: null, created_at: "" },
        { id: 50, slug: "unknown_a", name: "A", description: "", icon_url: null, category: "special", threshold: null, created_at: "" },
        { id: 1, slug: "first_prediction", name: "First", description: "", icon_url: null, category: "predictions", threshold: 1, created_at: "" },
      ],
      error: null,
    });
    mockTable("user_achievements", { data: [], error: null });

    const { achievements } = await fetchAchievementsData(supabase, "user-1");
    expect(achievements.map((a) => a.slug)).toEqual([
      "first_prediction",
      "unknown_a",
      "unknown_b",
    ]);
  });

  it("returns correct earnedIds from user_achievements", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", {
      data: [
        { id: 1, slug: "first_prediction", name: "First", description: "", icon_url: null, category: "predictions", threshold: 1, created_at: "" },
        { id: 2, slug: "10_predictions", name: "10 Predictions", description: "", icon_url: null, category: "predictions", threshold: 10, created_at: "" },
      ],
      error: null,
    });
    mockTable("user_achievements", {
      data: [
        { achievement_id: 1 },
        { achievement_id: 2 },
      ],
      error: null,
    });

    const { earnedIds } = await fetchAchievementsData(supabase, "user-1");
    expect(earnedIds).toEqual([1, 2]);
  });

  it("returns empty earnedIds when user has no achievements", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("achievements", {
      data: [
        { id: 1, slug: "first_prediction", name: "First", description: "", icon_url: null, category: "predictions", threshold: 1, created_at: "" },
      ],
      error: null,
    });
    mockTable("user_achievements", { data: [], error: null });

    const { earnedIds } = await fetchAchievementsData(supabase, "user-1");
    expect(earnedIds).toEqual([]);
  });
});
