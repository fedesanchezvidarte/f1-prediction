/**
 * Tests for POST /api/predictions/submit
 *
 * Covers: auth (401), invalid JSON (400), invalid type (400),
 * race validation, sprint validation, champion validation, success paths.
 */

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockCreateClient = jest.fn().mockResolvedValue({
  auth: { getUser: mockGetUser },
  from: mockFrom,
});

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import { POST } from "@/app/api/predictions/submit/route";
import {
  createMockRequest,
  createBadJsonRequest,
  parseResponse,
} from "../helpers/mockApiRoute";

function setUser(user: { id: string } | null) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function chain(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    select: () => c,
    update: () => c,
    insert: () => c,
    eq: () => c,
    in: () => c,
    single: () => ({ data, error }),
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve({ data, error }).then(res ?? undefined),
  };
  return c;
}

describe("POST /api/predictions/submit", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(
      await POST(createMockRequest({ type: "race" }))
    );
    expect(status).toBe(401);
  });

  it("returns 400 for invalid JSON body", async () => {
    setUser({ id: "u1" });
    const { status, json } = await parseResponse(
      await POST(createBadJsonRequest())
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 for unknown prediction type", async () => {
    setUser({ id: "u1" });
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ type: "qualifying" }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid prediction type/i);
  });

  // ── Race prediction validation ──────────────────────────────────────

  it("returns 400 when race top10 has wrong length", async () => {
    setUser({ id: "u1" });
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          type: "race",
          raceId: 1,
          top10: [1, 2, 3],
          polePositionDriverNumber: 1,
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/top10.*10/i);
  });

  it("returns 400 when race top10 contains duplicates", async () => {
    setUser({ id: "u1" });
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          type: "race",
          raceId: 1,
          top10: [1, 1, 3, 4, 5, 6, 7, 8, 9, 10],
          polePositionDriverNumber: 1,
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/duplicate/i);
  });

  it("returns 404 when race not found by meetingKey", async () => {
    setUser({ id: "u1" });
    // race lookup returns null
    mockFrom.mockReturnValue(chain(null));

    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          type: "race",
          raceId: 9999,
          top10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          polePositionDriverNumber: 1,
          fastestLapDriverNumber: 2,
          fastestPitStopDriverNumber: 3,
          driverOfTheDayDriverNumber: 4,
        })
      )
    );
    expect(status).toBe(404);
    expect(json.error).toMatch(/race not found/i);
  });

  it("returns 400 when trying to modify a scored prediction", async () => {
    setUser({ id: "u1" });
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 42 }); // races lookup
      if (callIdx === 2) return chain({ id: 1 }); // seasons
      if (callIdx === 3) {
        // drivers
        return {
          select: () => ({
            eq: () => ({
              then: (res: ((v: unknown) => unknown) | null) =>
                Promise.resolve({
                  data: [
                    { id: 101, driver_number: 1 },
                    { id: 102, driver_number: 2 },
                    { id: 103, driver_number: 3 },
                    { id: 104, driver_number: 4 },
                    { id: 105, driver_number: 5 },
                    { id: 106, driver_number: 6 },
                    { id: 107, driver_number: 7 },
                    { id: 108, driver_number: 8 },
                    { id: 109, driver_number: 9 },
                    { id: 110, driver_number: 10 },
                  ],
                  error: null,
                }).then(res ?? undefined),
            }),
          }),
        };
      }
      // existing prediction → scored
      return chain({ id: 999, status: "scored" });
    });

    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          type: "race",
          raceId: 1,
          top10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          polePositionDriverNumber: 1,
          fastestLapDriverNumber: 2,
          fastestPitStopDriverNumber: 3,
          driverOfTheDayDriverNumber: 4,
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/scored/i);
  });

  // ── Sprint prediction validation ────────────────────────────────────

  it("returns 400 when sprint top8 has wrong length", async () => {
    setUser({ id: "u1" });
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          type: "sprint",
          raceId: 1,
          top8: [1, 2, 3],
          sprintPoleDriverNumber: 1,
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/top8.*8/i);
  });

  it("returns 400 when sprint top8 has duplicates", async () => {
    setUser({ id: "u1" });
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          type: "sprint",
          raceId: 1,
          top8: [1, 1, 3, 4, 5, 6, 7, 8],
          sprintPoleDriverNumber: 1,
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/duplicate/i);
  });

  // ── Champion prediction ─────────────────────────────────────────────

  it("returns 404 when no active season for champion prediction", async () => {
    setUser({ id: "u1" });
    mockFrom.mockReturnValue(chain(null));

    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          type: "champion",
          wdcDriverNumber: 1,
          wccTeamName: "Red Bull",
          mostDnfsDriverNumber: null,
          mostPodiumsDriverNumber: null,
          mostWinsDriverNumber: null,
          isHalfPoints: false,
        })
      )
    );
    expect(status).toBe(404);
    expect(json.error).toMatch(/no active season/i);
  });
});
