/**
 * Tests for POST /api/results/manual
 *
 * Covers: auth (401), admin (403), body validation, race + sprint paths.
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

jest.mock("@/lib/admin", () => ({
  isAdminUser: jest.fn(),
}));

jest.mock("@/lib/scoring-service", () => ({
  scoreRaceForId: jest.fn(),
}));

import { POST } from "@/app/api/results/manual/route";
import { isAdminUser } from "@/lib/admin";
import { scoreRaceForId } from "@/lib/scoring-service";
import {
  createMockRequest,
  createBadJsonRequest,
  parseResponse,
} from "../helpers/mockApiRoute";

function setUser(user: { id: string; app_metadata?: Record<string, unknown> } | null) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setAdmin() {
  setUser({ id: "admin-1" });
  (isAdminUser as jest.Mock).mockReturnValue(true);
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

const validRaceBody = {
  raceId: 1,
  sessionType: "race",
  polePositionDriverId: 10,
  top10: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  fastestLapDriverId: 20,
  fastestPitStopDriverId: 30,
};
const validSprintBody = {
  raceId: 1,
  sessionType: "sprint",
  sprintPoleDriverId: 10,
  top8: [10, 20, 30, 40, 50, 60, 70, 80],
  fastestLapDriverId: 20,
};

describe("POST /api/results/manual", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(
      await POST(createMockRequest(validRaceBody))
    );
    expect(status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    setUser({ id: "u1" });
    (isAdminUser as jest.Mock).mockReturnValue(false);
    const { status } = await parseResponse(
      await POST(createMockRequest(validRaceBody))
    );
    expect(status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    setAdmin();
    const { status } = await parseResponse(await POST(createBadJsonRequest()));
    expect(status).toBe(400);
  });

  it("returns 400 when raceId and sessionType are missing", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({}))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/required/i);
  });

  it("returns 404 when race not found", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain(null));
    const { status, json } = await parseResponse(
      await POST(createMockRequest(validRaceBody))
    );
    expect(status).toBe(404);
    expect(json.error).toMatch(/race not found/i);
  });

  it("returns 400 when sprint is requested but race has no sprint", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain({ id: 1, has_sprint: false }));

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validSprintBody))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/sprint session/i);
  });

  it("returns 400 when race top10 has wrong length", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain({ id: 1, has_sprint: false }));

    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          ...validRaceBody,
          top10: [1, 2, 3], // too few
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/top10/i);
  });

  it("returns 400 when top10 contains invalid IDs", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain({ id: 1, has_sprint: false }));

    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          ...validRaceBody,
          top10: [1, 2, 3, -4, 5, 6, 7, 8, 9, 10],
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/valid positive/i);
  });

  it("returns 400 when sprint top8 has wrong length", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain({ id: 1, has_sprint: true }));

    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          ...validSprintBody,
          top8: [1, 2, 3], // too few
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/top8/i);
  });

  it("saves race result and triggers scoring on success", async () => {
    setAdmin();
    let tableIdx = 0;
    mockFrom.mockImplementation(() => {
      tableIdx++;
      if (tableIdx === 1) {
        // races select → found
        return chain({ id: 1, has_sprint: false });
      }
      // Remaining: race_results select (no existing) + insert
      return chain(null);
    });
    (scoreRaceForId as jest.Mock).mockResolvedValue({
      racePredictionsScored: 3,
      sprintPredictionsScored: 0,
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validRaceBody))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.source).toBe("manual");
    expect(scoreRaceForId).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it("saves sprint result and triggers scoring on success", async () => {
    setAdmin();
    let tableIdx = 0;
    mockFrom.mockImplementation(() => {
      tableIdx++;
      if (tableIdx === 1) return chain({ id: 1, has_sprint: true });
      return chain(null);
    });
    (scoreRaceForId as jest.Mock).mockResolvedValue({
      racePredictionsScored: 0,
      sprintPredictionsScored: 2,
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validSprintBody))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(scoreRaceForId).toHaveBeenCalled();
  });

  it("returns 500 when DB insert throws", async () => {
    setAdmin();
    let tableIdx = 0;
    mockFrom.mockImplementation(() => {
      tableIdx++;
      if (tableIdx === 1) return chain({ id: 1, has_sprint: false });
      if (tableIdx === 2) return chain(null); // no existing result
      // insert throws
      return chain(null, { message: "insert failed" });
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validRaceBody))
    );
    expect(status).toBe(500);
    expect(json.error).toMatch(/failed/i);
  });
});
