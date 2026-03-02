/**
 * Tests for POST /api/results/score-all
 *
 * Covers: auth (401), admin (403), no season (404), no races, success path.
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

import { POST } from "@/app/api/results/score-all/route";
import { isAdminUser } from "@/lib/admin";
import { scoreRaceForId } from "@/lib/scoring-service";
import { parseResponse } from "../helpers/mockApiRoute";

// ── Chain builder ────────────────────────────────────────────────────

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {
    select: () => c,
    update: () => c,
    eq: () => c,
    in: () => c,
    order: () => c,
    single: () => result,
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve(result).then(res ?? undefined),
  };
  return c;
}

// ── Tests ────────────────────────────────────────────────────────────

describe("POST /api/results/score-all", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setUser(user: { id: string; app_metadata?: Record<string, unknown> } | null) {
    mockGetUser.mockResolvedValue({ data: { user }, error: null });
  }

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(await POST());
    expect(status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    setUser({ id: "u1" });
    (isAdminUser as jest.Mock).mockReturnValue(false);
    const { status } = await parseResponse(await POST());
    expect(status).toBe(403);
  });

  it("returns 404 when no active season", async () => {
    setUser({ id: "admin" });
    (isAdminUser as jest.Mock).mockReturnValue(true);
    mockFrom.mockReturnValue(chain({ data: null, error: null }));

    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(404);
    expect(json.error).toMatch(/no active season/i);
  });

  it("returns success with 0 when season has no races", async () => {
    setUser({ id: "admin" });
    (isAdminUser as jest.Mock).mockReturnValue(true);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // seasons
        return chain({ data: { id: 1 }, error: null });
      }
      // races → empty
      return chain({ data: [], error: null });
    });

    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(200);
    expect(json.racesScored).toBe(0);
  });

  it("scores races with results and returns totals", async () => {
    setUser({ id: "admin" });
    (isAdminUser as jest.Mock).mockReturnValue(true);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const c: Record<string, unknown> = {
        select: () => c,
        update: () => c,
        eq: () => c,
        in: () => c,
        order: () => c,
        single: () => {
          if (callCount === 1) return { data: { id: 1 }, error: null }; // season
          return { data: null, error: null };
        },
        then: (res: ((v: unknown) => unknown) | null) => {
          let data: unknown;
          if (callCount === 1) data = { data: { id: 1 }, error: null }; // season
          else if (callCount === 2) data = { data: [{ id: 10 }, { id: 20 }], error: null }; // races
          else if (callCount === 3) data = { data: [{ race_id: 10 }], error: null }; // race_results
          else if (callCount === 4) data = { data: [{ race_id: 20 }], error: null }; // sprint_results
          else data = { data: null, error: null }; // reverts
          return Promise.resolve(data).then(res ?? undefined);
        },
      };
      return c;
    });

    (scoreRaceForId as jest.Mock)
      .mockResolvedValueOnce({ racePredictionsScored: 3, sprintPredictionsScored: 0 })
      .mockResolvedValueOnce({ racePredictionsScored: 2, sprintPredictionsScored: 1 });

    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.totalRace).toBe(5);
    expect(json.totalSprint).toBe(1);
    expect(scoreRaceForId).toHaveBeenCalledTimes(2);
  });
});
