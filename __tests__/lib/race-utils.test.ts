/**
 * Tests for lib/race-utils.ts — pure date-based logic.
 *
 * Covers: getRaceStatus, getNextRace, getPredictionCardRaces
 * Uses jest.useFakeTimers() to control Date.
 */
import { getRaceStatus, getNextRace, getPredictionCardRaces, getChampionPredictionPhase, CHAMPION_CLOSE_ROUND } from "@/lib/race-utils";
import type { Race } from "@/types";

/* ── Helper: minimal Race object factory ── */
function makeRace(overrides: Partial<Race> & Pick<Race, "dateStart" | "dateEnd">): Race {
  return {
    meetingKey: 1,
    raceName: "Test GP",
    officialName: "Test Grand Prix",
    circuitShortName: "TST",
    countryName: "Testland",
    countryCode: "TL",
    location: "Testville",
    round: 1,
    hasSprint: false,
    sprintDateEnd: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

/* ═══════════════════════════════════════════════════════════════════════
   getRaceStatus
   ═══════════════════════════════════════════════════════════════════════ */
describe("getRaceStatus", () => {
  const race = makeRace({
    dateStart: "2026-06-15T14:00:00Z",
    dateEnd: "2026-06-15T16:00:00Z",
  });

  it("returns 'upcoming' when now is before dateStart", () => {
    jest.setSystemTime(new Date("2026-06-15T13:00:00Z"));
    expect(getRaceStatus(race)).toBe("upcoming");
  });

  it("returns 'live' when now is between dateStart and dateEnd", () => {
    jest.setSystemTime(new Date("2026-06-15T15:00:00Z"));
    expect(getRaceStatus(race)).toBe("live");
  });

  it("returns 'completed' when now is after dateEnd", () => {
    jest.setSystemTime(new Date("2026-06-15T17:00:00Z"));
    expect(getRaceStatus(race)).toBe("completed");
  });

  it("returns 'live' at exactly dateStart boundary", () => {
    jest.setSystemTime(new Date("2026-06-15T14:00:00Z"));
    // now >= start (equal) and now <= end → live
    expect(getRaceStatus(race)).toBe("live");
  });

  it("returns 'live' at exactly dateEnd boundary", () => {
    jest.setSystemTime(new Date("2026-06-15T16:00:00Z"));
    // now >= start and now <= end (equal) → live
    expect(getRaceStatus(race)).toBe("live");
  });

  it("returns 'completed' 1ms after dateEnd", () => {
    jest.setSystemTime(new Date("2026-06-15T16:00:00.001Z"));
    expect(getRaceStatus(race)).toBe("completed");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   getNextRace
   ═══════════════════════════════════════════════════════════════════════ */
describe("getNextRace", () => {
  const pastRace1 = makeRace({
    meetingKey: 1,
    raceName: "Past 1",
    dateStart: "2026-01-01T14:00:00Z",
    dateEnd: "2026-01-01T16:00:00Z",
  });
  const pastRace2 = makeRace({
    meetingKey: 2,
    raceName: "Past 2",
    dateStart: "2026-02-01T14:00:00Z",
    dateEnd: "2026-02-01T16:00:00Z",
  });
  const futureRace1 = makeRace({
    meetingKey: 3,
    raceName: "Future 1",
    dateStart: "2026-07-01T14:00:00Z",
    dateEnd: "2026-07-01T16:00:00Z",
  });
  const futureRace2 = makeRace({
    meetingKey: 4,
    raceName: "Future 2",
    dateStart: "2026-08-01T14:00:00Z",
    dateEnd: "2026-08-01T16:00:00Z",
  });

  beforeEach(() => {
    jest.setSystemTime(new Date("2026-06-15T12:00:00Z"));
  });

  it("returns undefined when all races are in the past", () => {
    expect(getNextRace([pastRace1, pastRace2])).toBeUndefined();
  });

  it("returns the first future race when there is a mix", () => {
    expect(getNextRace([pastRace1, pastRace2, futureRace1, futureRace2])).toEqual(futureRace1);
  });

  it("returns the first race when all are in the future", () => {
    expect(getNextRace([futureRace1, futureRace2])).toEqual(futureRace1);
  });

  it("returns a race that is currently live (dateEnd is in the future)", () => {
    const liveRace = makeRace({
      meetingKey: 5,
      raceName: "Live Race",
      dateStart: "2026-06-15T10:00:00Z",
      dateEnd: "2026-06-15T14:00:00Z",
    });
    expect(getNextRace([pastRace1, liveRace, futureRace1])).toEqual(liveRace);
  });

  it("returns undefined for empty array", () => {
    expect(getNextRace([])).toBeUndefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   getPredictionCardRaces
   ═══════════════════════════════════════════════════════════════════════ */
describe("getPredictionCardRaces", () => {
  beforeEach(() => {
    jest.setSystemTime(new Date("2026-06-15T15:00:00Z"));
  });

  const liveRace = makeRace({
    meetingKey: 10,
    raceName: "Live GP",
    dateStart: "2026-06-15T14:00:00Z",
    dateEnd: "2026-06-15T16:00:00Z",
  });

  const upcoming1 = makeRace({
    meetingKey: 11,
    raceName: "Upcoming 1",
    dateStart: "2026-07-01T14:00:00Z",
    dateEnd: "2026-07-01T16:00:00Z",
  });
  const upcoming2 = makeRace({
    meetingKey: 12,
    raceName: "Upcoming 2",
    dateStart: "2026-08-01T14:00:00Z",
    dateEnd: "2026-08-01T16:00:00Z",
  });
  const upcoming3 = makeRace({
    meetingKey: 13,
    raceName: "Upcoming 3",
    dateStart: "2026-09-01T14:00:00Z",
    dateEnd: "2026-09-01T16:00:00Z",
  });
  const upcoming4 = makeRace({
    meetingKey: 14,
    raceName: "Upcoming 4",
    dateStart: "2026-10-01T14:00:00Z",
    dateEnd: "2026-10-01T16:00:00Z",
  });
  const upcoming5 = makeRace({
    meetingKey: 15,
    raceName: "Upcoming 5",
    dateStart: "2026-11-01T14:00:00Z",
    dateEnd: "2026-11-01T16:00:00Z",
  });

  it("returns first 3 upcoming when no live race", () => {
    jest.setSystemTime(new Date("2026-05-01T12:00:00Z"));
    const result = getPredictionCardRaces([upcoming1, upcoming2, upcoming3, upcoming4, upcoming5]);
    expect(result).toEqual([upcoming1, upcoming2, upcoming3]);
  });

  it("returns [live, up1, up2] when there is a live race", () => {
    const result = getPredictionCardRaces([liveRace, upcoming1, upcoming2, upcoming3]);
    expect(result).toEqual([liveRace, upcoming1, upcoming2]);
  });

  it("returns [null, null, null] for 0 races", () => {
    const result = getPredictionCardRaces([]);
    expect(result).toEqual([null, null, null]);
  });

  it("returns [live, null, null] when only a live race exists", () => {
    const result = getPredictionCardRaces([liveRace]);
    expect(result).toEqual([liveRace, null, null]);
  });

  it("pads with nulls when fewer than 3 races available", () => {
    const result = getPredictionCardRaces([liveRace, upcoming1]);
    expect(result).toEqual([liveRace, upcoming1, null]);
  });

  it("always returns exactly 3 items", () => {
    const result = getPredictionCardRaces([liveRace, upcoming1, upcoming2, upcoming3, upcoming4, upcoming5]);
    expect(result).toHaveLength(3);
  });

  it("ignores past races", () => {
    const pastRace = makeRace({
      meetingKey: 99,
      raceName: "Past GP",
      dateStart: "2026-01-01T14:00:00Z",
      dateEnd: "2026-01-01T16:00:00Z",
    });
    const result = getPredictionCardRaces([pastRace, upcoming1, upcoming2]);
    expect(result).toEqual([upcoming1, upcoming2, null]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   getChampionPredictionPhase
   ═══════════════════════════════════════════════════════════════════════ */
describe("getChampionPredictionPhase", () => {
  // Realistic 2026 calendar with Round 14 as the close-round (Dutch GP after summer break)
  const seasonRaces = [
    makeRace({ round: 1, dateStart: "2026-03-08T14:00:00Z", dateEnd: "2026-03-08T16:00:00Z" }),
    makeRace({ round: 2, dateStart: "2026-03-22T14:00:00Z", dateEnd: "2026-03-22T16:00:00Z" }),
    makeRace({ round: 3, dateStart: "2026-04-05T14:00:00Z", dateEnd: "2026-04-05T16:00:00Z" }),
    makeRace({ round: 4, dateStart: "2026-04-19T14:00:00Z", dateEnd: "2026-04-19T16:00:00Z" }),
    makeRace({ round: 5, dateStart: "2026-05-03T14:00:00Z", dateEnd: "2026-05-03T16:00:00Z" }),
    makeRace({ round: 6, dateStart: "2026-05-17T14:00:00Z", dateEnd: "2026-05-17T16:00:00Z" }),
    makeRace({ round: 7, dateStart: "2026-06-07T14:00:00Z", dateEnd: "2026-06-07T16:00:00Z" }),
    makeRace({ round: 8, dateStart: "2026-06-21T14:00:00Z", dateEnd: "2026-06-21T16:00:00Z" }),
    makeRace({ round: 9, dateStart: "2026-07-05T14:00:00Z", dateEnd: "2026-07-05T16:00:00Z" }),
    makeRace({ round: 10, dateStart: "2026-07-19T14:00:00Z", dateEnd: "2026-07-19T16:00:00Z" }),
    makeRace({ round: 11, dateStart: "2026-07-26T14:00:00Z", dateEnd: "2026-07-26T16:00:00Z" }),
    makeRace({ round: 12, dateStart: "2026-08-02T14:00:00Z", dateEnd: "2026-08-02T16:00:00Z" }),
    makeRace({ round: 13, dateStart: "2026-08-09T14:00:00Z", dateEnd: "2026-08-09T16:00:00Z" }),
    // Round 14 — Dutch GP (first race after summer break) — CHAMPION_CLOSE_ROUND
    makeRace({ round: 14, dateStart: "2026-08-21T11:30:00Z", dateEnd: "2026-08-21T14:30:00Z" }),
    makeRace({ round: 15, dateStart: "2026-09-06T14:00:00Z", dateEnd: "2026-09-06T16:00:00Z" }),
  ];

  it("CHAMPION_CLOSE_ROUND is 14", () => {
    expect(CHAMPION_CLOSE_ROUND).toBe(14);
  });

  it("returns 'closed' for empty races array", () => {
    expect(getChampionPredictionPhase([])).toBe("closed");
  });

  it("returns 'full' before Round 2 starts", () => {
    jest.setSystemTime(new Date("2026-03-01T00:00:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("full");
  });

  it("returns 'full' during Round 1 (before Round 2 dateStart)", () => {
    jest.setSystemTime(new Date("2026-03-08T15:00:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("full");
  });

  it("returns 'full' between Round 1 end and Round 2 start", () => {
    jest.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("full");
  });

  it("returns 'half' at exactly Round 2 start", () => {
    jest.setSystemTime(new Date("2026-03-22T14:00:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("half");
  });

  it("returns 'half' during the mid-season (between Round 2 and Round 14)", () => {
    jest.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("half");
  });

  it("returns 'half' just before Round 14 dateStart", () => {
    jest.setSystemTime(new Date("2026-08-21T11:29:59Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("half");
  });

  it("returns 'closed' at exactly Round 14 dateStart", () => {
    jest.setSystemTime(new Date("2026-08-21T11:30:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("closed");
  });

  it("returns 'closed' after Round 14 starts", () => {
    jest.setSystemTime(new Date("2026-08-21T14:00:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("closed");
  });

  it("returns 'closed' well into the second half of the season", () => {
    jest.setSystemTime(new Date("2026-09-10T12:00:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("closed");
  });

  it("returns 'full' when there is only Round 1 (no Round 2)", () => {
    jest.setSystemTime(new Date("2026-03-10T00:00:00Z"));
    const singleRace = [seasonRaces[0]];
    expect(getChampionPredictionPhase(singleRace)).toBe("full");
  });

  it("handles unsorted races array", () => {
    jest.setSystemTime(new Date("2026-03-15T12:00:00Z"));
    const reversed = [...seasonRaces].reverse();
    expect(getChampionPredictionPhase(reversed)).toBe("full");
  });

  it("returns 'half' when close-round is missing but Round 2 has started", () => {
    jest.setSystemTime(new Date("2026-04-10T00:00:00Z"));
    // Only early rounds — no Round 14 in the calendar
    const earlyRaces = seasonRaces.slice(0, 4);
    expect(getChampionPredictionPhase(earlyRaces)).toBe("half");
  });

  it("returns 'half' during the summer break gap before Round 14", () => {
    jest.setSystemTime(new Date("2026-08-15T00:00:00Z"));
    expect(getChampionPredictionPhase(seasonRaces)).toBe("half");
  });
});
