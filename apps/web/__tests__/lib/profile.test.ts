/**
 * Tests for packages/shared/lib/profile.ts — fetchProfileData with mocked
 * Supabase.
 *
 * Query order inside fetchProfileData (matters for the mock queues):
 *   Promise.all builds the chains in order — the two `.single()` calls consume
 *   synchronously while the array literal is evaluated, the count query's
 *   thenable consumes when Promise.all awaits it:
 *     1. profiles          (.single(), the user's profile row)
 *     2. leaderboard       (.single(), total_points / rank / predictions_count)
 *     3. user_achievements (head count query — `count`, not `data`)
 *   Each table is queried exactly once, so every queue holds a single entry.
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import { fetchProfileData, type ProfileFallbacks } from "@f1/shared/lib/profile";

const USER_ID = "user-123";

const FULL_PROFILE_ROW = {
  id: USER_ID,
  display_name: "Alice",
  email: "alice@example.com",
  avatar_url: "https://a/img.png",
  country_code: "ES",
  created_at: "2026-01-15T10:00:00Z",
};

const LEADERBOARD_ROW = {
  total_points: 142,
  rank: 3,
  predictions_count: 9,
};

const FALLBACKS: ProfileFallbacks = {
  displayName: "Auth Alice",
  email: "auth-alice@example.com",
  avatarUrl: "https://auth/img.png",
  createdAt: "2025-12-01T00:00:00Z",
};

function setup(options?: {
  profileRow?: unknown;
  leaderboardRow?: unknown;
  achievementsCount?: number | null;
}) {
  const { supabase, mockTable } = createMockSupabase();
  mockTable("profiles", {
    data: options && "profileRow" in options ? options.profileRow : FULL_PROFILE_ROW,
    error: null,
  });
  mockTable("leaderboard", {
    data:
      options && "leaderboardRow" in options ? options.leaderboardRow : LEADERBOARD_ROW,
    error: null,
  });
  mockTable("user_achievements", {
    data: null,
    error: null,
    // MockResponse.count is `number | undefined`; a Supabase null count behaves
    // identically to undefined through the `?? 0` in fetchProfileData.
    count:
      options && "achievementsCount" in options
        ? options.achievementsCount ?? undefined
        : 4,
  });
  return supabase;
}

describe("fetchProfileData", () => {
  it("assembles profile and stats from the three queries, ignoring fallbacks when the row is complete", async () => {
    const supabase = setup();

    const { profile, stats } = await fetchProfileData(supabase, USER_ID, FALLBACKS);

    // Row values win over every provided fallback.
    expect(profile).toEqual({
      id: USER_ID,
      displayName: "Alice",
      email: "alice@example.com",
      avatarUrl: "https://a/img.png",
      countryCode: "ES",
      createdAt: "2026-01-15T10:00:00Z",
    });
    expect(stats).toEqual({
      totalPoints: 142,
      rank: 3,
      predictionsCount: 9,
      achievementsCount: 4,
    });
  });

  describe("profile fallback chain", () => {
    it("uses the auth fallbacks when the profile row is null", async () => {
      const supabase = setup({ profileRow: null });

      const { profile } = await fetchProfileData(supabase, USER_ID, FALLBACKS);

      expect(profile).toEqual({
        id: USER_ID,
        displayName: "Auth Alice",
        email: "auth-alice@example.com",
        avatarUrl: "https://auth/img.png",
        countryCode: null, // no fallback exists for countryCode
        createdAt: "2025-12-01T00:00:00Z",
      });
    });

    it("falls back per field: null row fields use fallbacks while populated ones keep row values", async () => {
      const supabase = setup({
        profileRow: {
          ...FULL_PROFILE_ROW,
          display_name: null,
          avatar_url: null,
        },
      });

      const { profile } = await fetchProfileData(supabase, USER_ID, FALLBACKS);

      expect(profile.displayName).toBe("Auth Alice");
      expect(profile.avatarUrl).toBe("https://auth/img.png");
      // Fields present on the row are untouched by fallbacks.
      expect(profile.email).toBe("alice@example.com");
      expect(profile.createdAt).toBe("2026-01-15T10:00:00Z");
    });

    it("uses the terminal defaults when both the row and the fallbacks are missing", async () => {
      const supabase = setup({ profileRow: null });

      const { profile } = await fetchProfileData(supabase, USER_ID, {});

      expect(profile).toEqual({
        id: USER_ID,
        displayName: "Driver",
        email: "",
        avatarUrl: null,
        countryCode: null,
        createdAt: "",
      });
    });

    it("defaults everything without a fallbacks argument at all", async () => {
      const supabase = setup({ profileRow: null, leaderboardRow: null, achievementsCount: null });

      const { profile, stats } = await fetchProfileData(supabase, USER_ID);

      expect(profile).toEqual({
        id: USER_ID,
        displayName: "Driver",
        email: "",
        avatarUrl: null,
        countryCode: null,
        createdAt: "",
      });
      expect(stats).toEqual({
        totalPoints: 0,
        rank: null,
        predictionsCount: 0,
        achievementsCount: 0,
      });
    });

    it("preserves an explicit null avatar fallback (avatarUrl stays null, not 'Driver'-style default)", async () => {
      const supabase = setup({ profileRow: null });

      const { profile } = await fetchProfileData(supabase, USER_ID, {
        ...FALLBACKS,
        avatarUrl: null,
      });

      expect(profile.avatarUrl).toBeNull();
    });
  });

  describe("stats", () => {
    it("maps leaderboard columns onto the stats shape", async () => {
      const supabase = setup({
        leaderboardRow: { total_points: 7, rank: 12, predictions_count: 1 },
      });

      const { stats } = await fetchProfileData(supabase, USER_ID, FALLBACKS);

      expect(stats).toMatchObject({
        totalPoints: 7,
        rank: 12,
        predictionsCount: 1,
      });
    });

    it("zeroes points and predictions and nulls the rank when the leaderboard row is missing", async () => {
      const supabase = setup({ leaderboardRow: null });

      const { stats } = await fetchProfileData(supabase, USER_ID, FALLBACKS);

      expect(stats).toEqual({
        totalPoints: 0,
        rank: null,
        predictionsCount: 0,
        achievementsCount: 4,
      });
    });

    it("treats a null achievements count as 0", async () => {
      const supabase = setup({ achievementsCount: null });

      const { stats } = await fetchProfileData(supabase, USER_ID, FALLBACKS);

      expect(stats.achievementsCount).toBe(0);
    });

    it("keeps a real 0 achievements count as 0", async () => {
      const supabase = setup({ achievementsCount: 0 });

      const { stats } = await fetchProfileData(supabase, USER_ID, FALLBACKS);

      expect(stats.achievementsCount).toBe(0);
    });
  });
});
