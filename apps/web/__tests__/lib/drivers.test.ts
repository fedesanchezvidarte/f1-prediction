/**
 * Tests for packages/shared/lib/drivers.ts — fetchDrivers and setDriverActive
 * against a mocked Supabase client.
 *
 * Query order inside fetchDrivers (matters for the mock queues):
 *   1. seasons (is_current) via .single()
 *   2. drivers (season_id [, is_active]) then .order()
 */
import { createMockSupabase } from "../helpers/mockSupabase";
import { fetchDrivers, setDriverActive } from "@f1/shared/lib/drivers";

const SEASON_ID = 7;

const DRIVER_ROW = {
  driver_number: 1,
  first_name: "Max",
  last_name: "Verstappen",
  name_acronym: "VER",
  headshot_url: "https://example.test/ver.png",
  team_id: 10,
  teams: { name: "Red Bull", color: "3671C6" },
};

function setup(driverRows: unknown) {
  const mock = createMockSupabase();
  mock.mockTable("seasons", { data: { id: SEASON_ID }, error: null });
  mock.mockTable("drivers", { data: driverRows, error: null });
  return mock;
}

describe("fetchDrivers", () => {
  it("returns an empty array when there is no current season", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("seasons", { data: null, error: null });

    expect(await fetchDrivers(supabase)).toEqual([]);
  });

  it("returns an empty array when the season has no drivers", async () => {
    const { supabase } = setup([]);
    expect(await fetchDrivers(supabase)).toEqual([]);
  });

  it("returns an empty array when the drivers payload is null", async () => {
    const { supabase } = setup(null);
    expect(await fetchDrivers(supabase)).toEqual([]);
  });

  it("filters to active drivers in the current season by default", async () => {
    const { supabase, getSelectCalls } = setup([DRIVER_ROW]);

    await fetchDrivers(supabase);

    expect(getSelectCalls()).toEqual([
      { table: "seasons", filters: { is_current: true } },
      { table: "drivers", filters: { season_id: SEASON_ID, is_active: true } },
    ]);
  });

  it("does not apply the is_active filter when includeInactive is true", async () => {
    const { supabase, getSelectCalls } = setup([DRIVER_ROW]);

    await fetchDrivers(supabase, { includeInactive: true });

    const driversCall = getSelectCalls().find((c) => c.table === "drivers");
    expect(driversCall?.filters).toEqual({ season_id: SEASON_ID });
    expect(driversCall?.filters).not.toHaveProperty("is_active");
  });

  it("still applies the is_active filter when includeInactive is explicitly false", async () => {
    const { supabase, getSelectCalls } = setup([DRIVER_ROW]);

    await fetchDrivers(supabase, { includeInactive: false });

    const driversCall = getSelectCalls().find((c) => c.table === "drivers");
    expect(driversCall?.filters).toEqual({ season_id: SEASON_ID, is_active: true });
  });

  it("flattens an object-shaped teams embed onto teamName and teamColor", async () => {
    const { supabase } = setup([DRIVER_ROW]);

    expect(await fetchDrivers(supabase)).toEqual([
      {
        driverNumber: 1,
        firstName: "Max",
        lastName: "Verstappen",
        nameAcronym: "VER",
        teamName: "Red Bull",
        teamColor: "3671C6",
        teamId: 10,
        headshotUrl: "https://example.test/ver.png",
      },
    ]);
  });

  it("flattens an array-shaped teams embed", async () => {
    const { supabase } = setup([
      { ...DRIVER_ROW, teams: [{ name: "Red Bull", color: "3671C6" }] },
    ]);

    const [driver] = await fetchDrivers(supabase);
    expect(driver.teamName).toBe("Red Bull");
    expect(driver.teamColor).toBe("3671C6");
  });

  it("falls back to Unknown / FFFFFF when the teams join is missing", async () => {
    const { supabase } = setup([{ ...DRIVER_ROW, team_id: null, teams: null }]);

    const [driver] = await fetchDrivers(supabase);
    expect(driver.teamName).toBe("Unknown");
    expect(driver.teamColor).toBe("FFFFFF");
    expect(driver.teamId).toBeUndefined();
  });

  it("falls back to Unknown / FFFFFF when the teams join is an empty array", async () => {
    const { supabase } = setup([{ ...DRIVER_ROW, teams: [] }]);

    const [driver] = await fetchDrivers(supabase);
    expect(driver.teamName).toBe("Unknown");
    expect(driver.teamColor).toBe("FFFFFF");
  });

  it("maps a missing headshot_url to undefined", async () => {
    const { supabase } = setup([{ ...DRIVER_ROW, headshot_url: null }]);

    const [driver] = await fetchDrivers(supabase);
    expect(driver.headshotUrl).toBeUndefined();
  });

  it("maps every returned row", async () => {
    const { supabase } = setup([
      DRIVER_ROW,
      { ...DRIVER_ROW, driver_number: 44, last_name: "Hamilton", name_acronym: "HAM" },
    ]);

    const drivers = await fetchDrivers(supabase);
    expect(drivers.map((d) => d.driverNumber)).toEqual([1, 44]);
    expect(drivers.map((d) => d.nameAcronym)).toEqual(["VER", "HAM"]);
  });
});

describe("setDriverActive", () => {
  it("updates drivers.is_active filtered by the driver id", async () => {
    const { supabase, mockTable, getUpdateCalls } = createMockSupabase();
    mockTable("drivers", { data: null, error: null });

    expect(await setDriverActive(supabase, 101, false)).toEqual({ error: null });
    expect(getUpdateCalls()).toEqual([
      { table: "drivers", data: { is_active: false }, filters: { id: 101 } },
    ]);
  });

  it("writes is_active true when reactivating", async () => {
    const { supabase, mockTable, getUpdateCalls } = createMockSupabase();
    mockTable("drivers", { data: null, error: null });

    await setDriverActive(supabase, 102, true);
    expect(getUpdateCalls()[0]).toEqual({
      table: "drivers",
      data: { is_active: true },
      filters: { id: 102 },
    });
  });

  it("surfaces a Supabase error as the error string", async () => {
    const { supabase, mockTable } = createMockSupabase();
    mockTable("drivers", { data: null, error: { message: "permission denied" } });

    expect(await setDriverActive(supabase, 101, false)).toEqual({
      error: "permission denied",
    });
  });
});
