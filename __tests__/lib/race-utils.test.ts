/**
 * Tests for lib/race-utils.ts — pure date-based logic.
 *
 * Covers: getRaceStatus, getNextRace, getPredictionCardRaces
 * Uses jest.useFakeTimers() to control Date.
 */
import { getRaceStatus, getNextRace, getPredictionCardRaces } from "@/lib/race-utils";
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
