/**
 * Tests for packages/shared/lib/lineup.ts — per-race lineup overrides.
 *
 * Pure functions (applyLineupOverrides, getUnavailableDriverNumbers,
 * buildTeamAtRace) are called directly. The service functions get a mocked
 * Supabase client.
 *
 * Query order inside fetchLineupRoster (matters for the mock queues):
 *   1. seasons (is_current) via .single()
 *   2. drivers (roster rows)            ─┐ issued together via Promise.all
 *   3. race_lineup_overrides            ─┘
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import {
  applyLineupOverrides,
  buildTeamAtRace,
  deleteLineupOverride,
  fetchLineupOverrides,
  fetchLineupRoster,
  fetchRaceLineup,
  fetchRaceLineups,
  getUnavailableDriverNumbers,
  upsertLineupOverride,
} from "@f1/shared/lib/lineup";
import type { Driver, RaceLineupEntry, RaceLineupOverride } from "@f1/shared/types";

const SEASON_ID = 7;
const RACE_ID = 501;

/* ── Fixtures ───────────────────────────────────────────────────────────── */

function makeDriver(driverNumber: number, overrides: Partial<Driver> = {}): Driver {
  return {
    driverNumber,
    firstName: `First${driverNumber}`,
    lastName: `Last${driverNumber}`,
    nameAcronym: `D${driverNumber}`,
    teamName: "Season Team",
    teamColor: "FF0000",
    teamId: 10,
    ...overrides,
  };
}

function makeEntry(
  driverNumber: number,
  overrides: Partial<RaceLineupEntry> = {}
): RaceLineupEntry {
  return {
    driverId: 100 + driverNumber,
    driverNumber,
    isUnavailable: false,
    teamId: null,
    teamName: null,
    teamColor: null,
    note: null,
    ...overrides,
  };
}

function makeOverride(
  raceId: number,
  driverId: number,
  overrides: Partial<RaceLineupOverride> = {}
): RaceLineupOverride {
  return {
    raceId,
    driverId,
    isUnavailable: false,
    teamId: null,
    note: null,
    ...overrides,
  };
}

/* ── applyLineupOverrides ───────────────────────────────────────────────── */

describe("applyLineupOverrides", () => {
  it("returns the exact input array when the lineup is empty", () => {
    const drivers = [makeDriver(1), makeDriver(44)];
    expect(applyLineupOverrides(drivers, [])).toBe(drivers);
  });

  it("swaps teamName, teamColor and teamId for a team override", () => {
    const drivers = [makeDriver(1)];
    const [result] = applyLineupOverrides(drivers, [
      makeEntry(1, { teamId: 99, teamName: "Loan Team", teamColor: "00FF00" }),
    ]);

    expect(result.teamId).toBe(99);
    expect(result.teamName).toBe("Loan Team");
    expect(result.teamColor).toBe("00FF00");
    expect(result.isUnavailable).toBeUndefined();
  });

  it("keeps the driver's own team colour when the override team has no colour", () => {
    const drivers = [makeDriver(1)];
    const [result] = applyLineupOverrides(drivers, [
      makeEntry(1, { teamId: 99, teamName: "Loan Team", teamColor: null }),
    ]);

    expect(result.teamName).toBe("Loan Team");
    expect(result.teamColor).toBe("FF0000");
  });

  it("sets isUnavailable on an unavailable entry without touching the team", () => {
    const drivers = [makeDriver(1)];
    const [result] = applyLineupOverrides(drivers, [makeEntry(1, { isUnavailable: true })]);

    expect(result.isUnavailable).toBe(true);
    expect(result.teamName).toBe("Season Team");
    expect(result.teamColor).toBe("FF0000");
    expect(result.teamId).toBe(10);
  });

  it("applies both the team swap and the unavailable flag from one entry", () => {
    const drivers = [makeDriver(1)];
    const [result] = applyLineupOverrides(drivers, [
      makeEntry(1, {
        isUnavailable: true,
        teamId: 99,
        teamName: "Loan Team",
        teamColor: "00FF00",
      }),
    ]);

    expect(result).toEqual({
      ...makeDriver(1),
      teamId: 99,
      teamName: "Loan Team",
      teamColor: "00FF00",
      isUnavailable: true,
    });
  });

  it("returns the same object reference for drivers with no matching override", () => {
    const drivers = [makeDriver(1), makeDriver(44)];
    const result = applyLineupOverrides(drivers, [makeEntry(1, { isUnavailable: true })]);

    expect(result[1]).toBe(drivers[1]);
    expect(result[0]).not.toBe(drivers[0]);
    expect(result).toHaveLength(2);
  });

  it("matches by driverNumber, not by driverId or array position", () => {
    const drivers = [makeDriver(1), makeDriver(44)];
    // driverId deliberately points at a different driver than driverNumber 44
    const result = applyLineupOverrides(drivers, [
      makeEntry(44, { driverId: 1, isUnavailable: true }),
    ]);

    expect(result[0].isUnavailable).toBeUndefined();
    expect(result[1].isUnavailable).toBe(true);
  });

  it("does not clobber the existing team when teamId is set but teamName is null", () => {
    const drivers = [makeDriver(1)];
    const [result] = applyLineupOverrides(drivers, [
      makeEntry(1, { teamId: 99, teamName: null, teamColor: null }),
    ]);

    expect(result.teamId).toBe(10);
    expect(result.teamName).toBe("Season Team");
    expect(result.teamColor).toBe("FF0000");
  });

  it("leaves an empty driver list empty", () => {
    expect(applyLineupOverrides([], [makeEntry(1, { isUnavailable: true })])).toEqual([]);
  });
});

/* ── getUnavailableDriverNumbers ────────────────────────────────────────── */

describe("getUnavailableDriverNumbers", () => {
  it("returns only the unavailable driver numbers", () => {
    const lineup = [
      makeEntry(1, { isUnavailable: true }),
      makeEntry(44, { teamId: 99, teamName: "Loan Team" }),
      makeEntry(16, { isUnavailable: true, teamId: 99, teamName: "Loan Team" }),
    ];
    expect(getUnavailableDriverNumbers(lineup)).toEqual([1, 16]);
  });

  it("returns [] for an empty lineup", () => {
    expect(getUnavailableDriverNumbers([])).toEqual([]);
  });

  it("returns [] when no entry is unavailable", () => {
    expect(getUnavailableDriverNumbers([makeEntry(1), makeEntry(44)])).toEqual([]);
  });
});

/* ── buildTeamAtRace ───────────────────────────────────────────────────── */

describe("buildTeamAtRace", () => {
  const seasonTeams = new Map<number, number | null>([
    [101, 10],
    [102, 20],
    [103, null],
  ]);

  it("returns the override team for the exact race and the season team elsewhere", () => {
    const teamAtRace = buildTeamAtRace(
      [makeOverride(501, 101, { teamId: 99 })],
      seasonTeams
    );

    expect(teamAtRace(101, 501)).toBe(99);
    expect(teamAtRace(101, 502)).toBe(10);
  });

  it("falls back to the season team for a bench-only override (teamId null)", () => {
    const teamAtRace = buildTeamAtRace(
      [makeOverride(501, 101, { isUnavailable: true, teamId: null })],
      seasonTeams
    );
    expect(teamAtRace(101, 501)).toBe(10);
  });

  it("returns null for a driver absent from the season map with no override", () => {
    const teamAtRace = buildTeamAtRace([], seasonTeams);
    expect(teamAtRace(999, 501)).toBeNull();
  });

  it("returns null for a driver whose season team is null and has no override", () => {
    const teamAtRace = buildTeamAtRace([], seasonTeams);
    expect(teamAtRace(103, 501)).toBeNull();
  });

  it("keeps overrides for different drivers and races independent", () => {
    const teamAtRace = buildTeamAtRace(
      [
        makeOverride(501, 101, { teamId: 99 }),
        makeOverride(502, 102, { teamId: 98 }),
      ],
      seasonTeams
    );

    expect(teamAtRace(101, 501)).toBe(99);
    expect(teamAtRace(102, 501)).toBe(20);
    expect(teamAtRace(102, 502)).toBe(98);
    expect(teamAtRace(101, 502)).toBe(10);
  });

  it("resolves an override for a driver missing from the season map", () => {
    const teamAtRace = buildTeamAtRace([makeOverride(501, 999, { teamId: 99 })], seasonTeams);
    expect(teamAtRace(999, 501)).toBe(99);
    expect(teamAtRace(999, 502)).toBeNull();
  });
});

/* ── fetchRaceLineup ───────────────────────────────────────────────────── */

describe("fetchRaceLineup", () => {
  const ROW = {
    race_id: RACE_ID,
    driver_id: 101,
    is_unavailable: true,
    team_id: 99,
    note: "Injured",
    drivers: { driver_number: 1 },
    teams: { name: "Loan Team", color: "00FF00" },
  };

  it("maps a row with object-shaped joins to a RaceLineupEntry", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: [ROW], error: null });

    expect(await fetchRaceLineup(supabase, RACE_ID)).toEqual([
      {
        driverId: 101,
        driverNumber: 1,
        isUnavailable: true,
        teamId: 99,
        teamName: "Loan Team",
        teamColor: "00FF00",
        note: "Injured",
      },
    ]);
  });

  it("unwraps one-element array joins for both drivers and teams", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", {
      data: [
        {
          ...ROW,
          drivers: [{ driver_number: 1 }],
          teams: [{ name: "Loan Team", color: "00FF00" }],
        },
      ],
      error: null,
    });

    const [entry] = await fetchRaceLineup(supabase, RACE_ID);
    expect(entry.driverNumber).toBe(1);
    expect(entry.teamName).toBe("Loan Team");
    expect(entry.teamColor).toBe("00FF00");
  });

  it("leaves teamName and teamColor null when the teams join is missing", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", {
      data: [{ ...ROW, team_id: null, teams: null }],
      error: null,
    });

    const [entry] = await fetchRaceLineup(supabase, RACE_ID);
    expect(entry.teamId).toBeNull();
    expect(entry.teamName).toBeNull();
    expect(entry.teamColor).toBeNull();
  });

  it("leaves teamName and teamColor null when the teams join is an empty array", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: [{ ...ROW, teams: [] }], error: null });

    const [entry] = await fetchRaceLineup(supabase, RACE_ID);
    expect(entry.teamName).toBeNull();
    expect(entry.teamColor).toBeNull();
  });

  it("skips a row whose drivers join is null but keeps the rest", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", {
      data: [
        { ...ROW, driver_id: 199, drivers: null },
        { ...ROW, driver_id: 102, drivers: { driver_number: 44 } },
      ],
      error: null,
    });

    const entries = await fetchRaceLineup(supabase, RACE_ID);
    expect(entries).toHaveLength(1);
    expect(entries[0].driverId).toBe(102);
    expect(entries[0].driverNumber).toBe(44);
  });

  it("filters the query on race_id", async () => {
    const { supabase, mockTable, getSelectCalls } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: [ROW], error: null });

    await fetchRaceLineup(supabase, RACE_ID);
    expect(getSelectCalls()).toEqual([
      { table: "race_lineup_overrides", filters: { race_id: RACE_ID } },
    ]);
  });

  it("returns [] when the payload is null", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: null });
    expect(await fetchRaceLineup(supabase, RACE_ID)).toEqual([]);
  });

  it("returns [] when the payload is not an array", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: { race_id: RACE_ID }, error: null });
    expect(await fetchRaceLineup(supabase, RACE_ID)).toEqual([]);
  });

  it("returns [] when the race has no overrides", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: [], error: null });
    expect(await fetchRaceLineup(supabase, RACE_ID)).toEqual([]);
  });
});

/* ── fetchLineupOverrides ──────────────────────────────────────────────── */

describe("fetchLineupOverrides", () => {
  it("returns [] without querying when raceIds is empty", async () => {
    const { supabase, mockTable, getSelectCalls } = createMockSupabase();
    mockTable("race_lineup_overrides", {
      data: [{ race_id: 1, driver_id: 1, is_unavailable: true, team_id: null, note: null }],
      error: null,
    });

    expect(await fetchLineupOverrides(supabase, [])).toEqual([]);
    expect(getSelectCalls()).toEqual([]);
  });

  it("maps rows to RaceLineupOverride and filters on the race ids", async () => {
    const { supabase, mockTable, getSelectCalls } = createMockSupabase();
    mockTable("race_lineup_overrides", {
      data: [
        { race_id: 501, driver_id: 101, is_unavailable: true, team_id: null, note: "Injured" },
        { race_id: 502, driver_id: 102, is_unavailable: false, team_id: 99, note: null },
      ],
      error: null,
    });

    expect(await fetchLineupOverrides(supabase, [501, 502])).toEqual([
      { raceId: 501, driverId: 101, isUnavailable: true, teamId: null, note: "Injured" },
      { raceId: 502, driverId: 102, isUnavailable: false, teamId: 99, note: null },
    ]);
    expect(getSelectCalls()).toEqual([
      { table: "race_lineup_overrides", filters: { race_id_in: [501, 502] } },
    ]);
  });

  it("returns [] when the payload is null", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: null });
    expect(await fetchLineupOverrides(supabase, [501])).toEqual([]);
  });
});

/* ── fetchLineupRoster ─────────────────────────────────────────────────── */

describe("fetchLineupRoster", () => {
  const DRIVER_ROW = {
    id: 101,
    driver_number: 1,
    first_name: "First1",
    last_name: "Last1",
    name_acronym: "D1",
    is_active: true,
    team_id: 10,
    teams: { name: "Season Team" },
  };

  it("returns [] when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    expect(await fetchLineupRoster(supabase, RACE_ID)).toEqual([]);
  });

  it("maps driver rows and attaches the matching override", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable("drivers", {
      data: [DRIVER_ROW, { ...DRIVER_ROW, id: 102, driver_number: 44, is_active: false }],
      error: null,
    });
    mockTable("race_lineup_overrides", {
      data: [
        { race_id: RACE_ID, driver_id: 101, is_unavailable: true, team_id: 99, note: "Injured" },
      ],
      error: null,
    });

    const roster = await fetchLineupRoster(supabase, RACE_ID);

    expect(roster).toHaveLength(2);
    expect(roster[0]).toEqual({
      driverId: 101,
      driverNumber: 1,
      firstName: "First1",
      lastName: "Last1",
      nameAcronym: "D1",
      seasonTeamId: 10,
      seasonTeamName: "Season Team",
      isActive: true,
      override: {
        raceId: RACE_ID,
        driverId: 101,
        isUnavailable: true,
        teamId: 99,
        note: "Injured",
      },
    });
    // The panel includes inactive drivers — that is where they get reactivated.
    expect(roster[1].isActive).toBe(false);
    expect(roster[1].override).toBeNull();
  });

  it("falls back to Unknown when the teams join is missing and null for team_id", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable("drivers", {
      data: [{ ...DRIVER_ROW, team_id: null, teams: null }],
      error: null,
    });
    mockTable("race_lineup_overrides", { data: [], error: null });

    const [entry] = await fetchLineupRoster(supabase, RACE_ID);
    expect(entry.seasonTeamId).toBeNull();
    expect(entry.seasonTeamName).toBe("Unknown");
  });

  it("unwraps an array-shaped teams join", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable("drivers", {
      data: [{ ...DRIVER_ROW, teams: [{ name: "Season Team" }] }],
      error: null,
    });
    mockTable("race_lineup_overrides", { data: [], error: null });

    const [entry] = await fetchLineupRoster(supabase, RACE_ID);
    expect(entry.seasonTeamName).toBe("Season Team");
  });

  it("scopes the roster query to the current season", async () => {
    const { supabase, mockTable, getSelectCalls } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable("drivers", { data: [DRIVER_ROW], error: null });
    mockTable("race_lineup_overrides", { data: [], error: null });

    await fetchLineupRoster(supabase, RACE_ID);

    const driverCall = getSelectCalls().find((c) => c.table === "drivers");
    expect(driverCall?.filters).toEqual({ season_id: SEASON_ID });
  });

  it("returns [] when the season has no driver rows", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: { id: SEASON_ID }, error: null });
    mockTable("drivers", { data: null, error: null });
    mockTable("race_lineup_overrides", { data: [], error: null });

    expect(await fetchLineupRoster(supabase, RACE_ID)).toEqual([]);
  });
});

/* ── upsertLineupOverride ──────────────────────────────────────────────── */

describe("upsertLineupOverride", () => {
  const BASE = { raceId: RACE_ID, driverId: 101, isUnavailable: false, teamId: null, note: null };

  it("deletes instead of upserting when the override says nothing", async () => {
    const { supabase, mockTable, getDeleteCalls, getInsertCalls } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: null });

    const result = await upsertLineupOverride(supabase, BASE);

    expect(result).toEqual({ error: null, deleted: true });
    expect(getInsertCalls()).toEqual([]);
    expect(getDeleteCalls()).toEqual([
      { table: "race_lineup_overrides", filters: { race_id: RACE_ID, driver_id: 101 } },
    ]);
  });

  it("surfaces the delete error from the empty-override path", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: { message: "delete failed" } });

    // `deleted` reports what actually happened, so a failed delete is not
    // reported as a deletion.
    expect(await upsertLineupOverride(supabase, BASE)).toEqual({
      error: "delete failed",
      deleted: false,
    });
  });

  it("upserts when the driver is unavailable", async () => {
    const { supabase, mockTable, getInsertCalls, getDeleteCalls } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: null });

    const result = await upsertLineupOverride(supabase, {
      ...BASE,
      isUnavailable: true,
      note: "Injured",
    });

    expect(result).toEqual({ error: null, deleted: false });
    expect(getDeleteCalls()).toEqual([]);
    expect(getInsertCalls()).toEqual([
      {
        table: "race_lineup_overrides",
        data: {
          race_id: RACE_ID,
          driver_id: 101,
          is_unavailable: true,
          team_id: null,
          note: "Injured",
        },
        filters: {},
      },
    ]);
  });

  it("upserts when only a team change is requested", async () => {
    const { supabase, mockTable, getInsertCalls } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: null });

    const result = await upsertLineupOverride(supabase, { ...BASE, teamId: 99 });

    expect(result).toEqual({ error: null, deleted: false });
    expect(getInsertCalls()[0].data).toEqual({
      race_id: RACE_ID,
      driver_id: 101,
      is_unavailable: false,
      team_id: 99,
      note: null,
    });
  });

  it("surfaces a Supabase error from the upsert as the error string", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: { message: "upsert failed" } });

    expect(await upsertLineupOverride(supabase, { ...BASE, teamId: 99 })).toEqual({
      error: "upsert failed",
      deleted: false,
    });
  });
});

/* ── deleteLineupOverride ──────────────────────────────────────────────── */

describe("deleteLineupOverride", () => {
  it("filters the delete on both race_id and driver_id", async () => {
    const { supabase, mockTable, getDeleteCalls } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: null });

    expect(await deleteLineupOverride(supabase, RACE_ID, 101)).toEqual({ error: null });
    expect(getDeleteCalls()).toEqual([
      { table: "race_lineup_overrides", filters: { race_id: RACE_ID, driver_id: 101 } },
    ]);
  });

  it("surfaces a Supabase error as the error string", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", { data: null, error: { message: "rls denied" } });

    expect(await deleteLineupOverride(supabase, RACE_ID, 101)).toEqual({ error: "rls denied" });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   Failed queries must not look like "no overrides"
   ═══════════════════════════════════════════════════════════════════════ */
describe("lineup query failures", () => {
  const dbError = { data: null, error: { message: "relation does not exist" } };

  /**
   * Returning [] on a failed read would be indistinguishable from "this race
   * has no overrides", which silently un-benches a driver and sends
   * constructor points back to their season teams. The most likely trigger is
   * the migration not having been run, so these must throw.
   */
  it("fetchRaceLineup throws instead of returning an empty lineup", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", dbError);

    await expect(fetchRaceLineup(supabase, RACE_ID)).rejects.toThrow(
      /race_lineup_overrides/
    );
  });

  it("fetchRaceLineup surfaces the underlying Supabase message and the race id", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", dbError);

    await expect(fetchRaceLineup(supabase, RACE_ID)).rejects.toThrow(
      /relation does not exist/
    );
    await expect(fetchRaceLineup(supabase, RACE_ID)).rejects.toThrow(
      new RegExp(`raceId=${RACE_ID}`)
    );
  });

  it("fetchRaceLineups throws instead of returning an empty map", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", dbError);

    await expect(fetchRaceLineups(supabase, [RACE_ID, RACE_ID + 1])).rejects.toThrow(
      /race_lineup_overrides/
    );
  });

  it("fetchLineupOverrides throws instead of returning an empty array", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", dbError);

    await expect(fetchLineupOverrides(supabase, [RACE_ID])).rejects.toThrow(
      /race_lineup_overrides/
    );
  });

  it("does not query — and so cannot throw — for an empty race list", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("race_lineup_overrides", dbError);

    await expect(fetchRaceLineups(supabase, [])).resolves.toEqual({});
    await expect(fetchLineupOverrides(supabase, [])).resolves.toEqual([]);
  });
});
