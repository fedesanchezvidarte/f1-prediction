/**
 * Tests for lib/driver-stats.ts
 *
 * Covers: computeDriverStats, getStatsLeaders, fetchDriverStatsForSeason
 */
import { computeDriverStats, getStatsLeaders, fetchDriverStatsForSeason } from "@/lib/driver-stats";
import { createMockSupabase } from "../helpers/mockSupabase";

/* ═══════════════════════════════════════════════════════════════════════
   computeDriverStats
   ═══════════════════════════════════════════════════════════════════════ */
describe("computeDriverStats", () => {
  it("returns empty map for empty results array", () => {
    const result = computeDriverStats([]);
    expect(result).toEqual({});
  });

  it("counts wins, podiums, and DNFs correctly for a single race", () => {
    const result = computeDriverStats([
      { top_10: [1, 44, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [55, 63] },
    ]);

    // P1 → 1 win + 1 podium
    expect(result[1]).toEqual({ driverId: 1, wins: 1, podiums: 1, dnfs: 0 });
    // P2 → 0 wins + 1 podium
    expect(result[44]).toEqual({ driverId: 44, wins: 0, podiums: 1, dnfs: 0 });
    // P3 → 0 wins + 1 podium
    expect(result[16]).toEqual({ driverId: 16, wins: 0, podiums: 1, dnfs: 0 });
    // P4 is not in top-3 or DNF list — no entry created
    expect(result[4]).toBeUndefined();
    // DNF drivers
    expect(result[55]).toEqual({ driverId: 55, wins: 0, podiums: 0, dnfs: 1 });
    expect(result[63]).toEqual({ driverId: 63, wins: 0, podiums: 0, dnfs: 1 });
  });

  it("accumulates stats across multiple races", () => {
    const result = computeDriverStats([
      { top_10: [1, 44, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [55] },
      { top_10: [44, 1, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [55] },
    ]);

    expect(result[1]).toEqual({ driverId: 1, wins: 1, podiums: 2, dnfs: 0 });
    expect(result[44]).toEqual({ driverId: 44, wins: 1, podiums: 2, dnfs: 0 });
    expect(result[16]).toEqual({ driverId: 16, wins: 0, podiums: 2, dnfs: 0 });
    expect(result[55]).toEqual({ driverId: 55, wins: 0, podiums: 0, dnfs: 2 });
  });

  it("counts no DNFs when dnf_driver_ids is null", () => {
    const result = computeDriverStats([
      { top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: null },
    ]);

    expect(result[1].dnfs).toBe(0);
    expect(result[2].dnfs).toBe(0);
    // Only P1-P3 get entries (no DNFs)
    expect(Object.keys(result)).toHaveLength(3);
  });

  it("counts no DNFs when dnf_driver_ids is an empty array", () => {
    const result = computeDriverStats([
      { top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [] },
    ]);

    expect(result[1].dnfs).toBe(0);
    // Only P1-P3 get entries (no DNFs)
    expect(Object.keys(result)).toHaveLength(3);
  });

  it("increments wins for same driver winning multiple races", () => {
    const result = computeDriverStats([
      { top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: null },
      { top_10: [1, 3, 2, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: null },
      { top_10: [1, 4, 5, 6, 7, 8, 9, 10, 2, 3], dnf_driver_ids: null },
    ]);

    expect(result[1].wins).toBe(3);
    expect(result[1].podiums).toBe(3);
  });

  it("counts both podium and DNF when driver appears in both across different races", () => {
    const result = computeDriverStats([
      { top_10: [1, 44, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: null },
      { top_10: [33, 11, 22, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [44] },
    ]);

    // Driver 44: P2 in race 1 (podium), DNF in race 2
    expect(result[44]).toEqual({ driverId: 44, wins: 0, podiums: 1, dnfs: 1 });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   getStatsLeaders
   ═══════════════════════════════════════════════════════════════════════ */
describe("getStatsLeaders", () => {
  it("returns null for all categories on empty stats map", () => {
    const leaders = getStatsLeaders({});
    expect(leaders.mostWins).toBeNull();
    expect(leaders.mostPodiums).toBeNull();
    expect(leaders.mostDnfs).toBeNull();
  });

  it("returns the single driver as leader for categories with count > 0", () => {
    const stats = computeDriverStats([
      { top_10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [20] },
    ]);
    const leaders = getStatsLeaders(stats);

    expect(leaders.mostWins).toEqual({ driverId: 1, count: 1 });
    expect(leaders.mostPodiums).toEqual({ driverId: 1, count: 1 });
    expect(leaders.mostDnfs).toEqual({ driverId: 20, count: 1 });
  });

  it("identifies correct leaders across multiple drivers", () => {
    const stats = computeDriverStats([
      { top_10: [1, 44, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [55] },
      { top_10: [1, 44, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [55, 63] },
      { top_10: [44, 1, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [55] },
    ]);
    const leaders = getStatsLeaders(stats);

    // Driver 1: 2 wins, driver 44: 1 win
    expect(leaders.mostWins).toEqual({ driverId: 1, count: 2 });
    // Driver 1 & 44: 3 podiums each, driver 16: 3 podiums → tie at 3; lowest ID wins (1)
    expect(leaders.mostPodiums).toEqual({ driverId: 1, count: 3 });
    // Driver 55: 3 dnfs
    expect(leaders.mostDnfs).toEqual({ driverId: 55, count: 3 });
  });

  it("breaks ties by picking the driver with the lower driverId", () => {
    const stats = {
      10: { driverId: 10, wins: 2, podiums: 0, dnfs: 0 },
      7: { driverId: 7, wins: 2, podiums: 0, dnfs: 0 },
    };
    const leaders = getStatsLeaders(stats);

    expect(leaders.mostWins).toEqual({ driverId: 7, count: 2 });
  });

  it("does not return a leader for a category where all counts are 0", () => {
    const stats = {
      1: { driverId: 1, wins: 0, podiums: 2, dnfs: 1 },
      44: { driverId: 44, wins: 0, podiums: 1, dnfs: 0 },
    };
    const leaders = getStatsLeaders(stats);

    expect(leaders.mostWins).toBeNull();
    expect(leaders.mostPodiums).toEqual({ driverId: 1, count: 2 });
    expect(leaders.mostDnfs).toEqual({ driverId: 1, count: 1 });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   fetchDriverStatsForSeason
   ═══════════════════════════════════════════════════════════════════════ */
describe("fetchDriverStatsForSeason", () => {
  it("returns empty stats when no current season exists", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    const result = await fetchDriverStatsForSeason(supabase);

    expect(result.stats).toEqual({});
    expect(result.leaders).toEqual({ mostWins: null, mostPodiums: null, mostDnfs: null });
  });

  it("returns empty stats when season has no races", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("races", { data: [], error: null });

    const result = await fetchDriverStatsForSeason(supabase);

    expect(result.stats).toEqual({});
    expect(result.leaders).toEqual({ mostWins: null, mostPodiums: null, mostDnfs: null });
  });

  it("computes stats from race results correctly", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("races", { data: [{ id: 10 }, { id: 20 }], error: null });
    mockTable("race_results", {
      data: [
        { top_10: [1, 44, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: [55] },
        { top_10: [44, 1, 16, 4, 5, 6, 7, 8, 9, 10], dnf_driver_ids: null },
      ],
      error: null,
    });

    const result = await fetchDriverStatsForSeason(supabase);

    expect(result.stats[1]).toEqual({ driverId: 1, wins: 1, podiums: 2, dnfs: 0 });
    expect(result.stats[44]).toEqual({ driverId: 44, wins: 1, podiums: 2, dnfs: 0 });
    expect(result.stats[55]).toEqual({ driverId: 55, wins: 0, podiums: 0, dnfs: 1 });
    expect(result.leaders.mostWins?.driverId).toBe(1); // tie broken by lower ID
    expect(result.leaders.mostDnfs).toEqual({ driverId: 55, count: 1 });
  });

  it("returns empty stats when race results query returns null", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: 1 }, error: null });
    mockTable("races", { data: [{ id: 10 }], error: null });
    mockTable("race_results", { data: null, error: null });

    const result = await fetchDriverStatsForSeason(supabase);

    expect(result.stats).toEqual({});
    expect(result.leaders).toEqual({ mostWins: null, mostPodiums: null, mostDnfs: null });
  });
});
