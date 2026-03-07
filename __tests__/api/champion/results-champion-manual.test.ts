/**
 * Tests for POST /api/results/champion/manual
 *
 * Covers: auth (401), admin (403), body validation, success.
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
  scoreSeasonAwardsForSeason: jest.fn(),
}));

import { POST } from "@/app/api/results/champion/manual/route";
import { isAdminUser } from "@/lib/admin";
import { scoreSeasonAwardsForSeason } from "@/lib/scoring-service";
import {
  createMockRequest,
  createBadJsonRequest,
  parseResponse,
} from "../../helpers/mockApiRoute";

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
    delete: () => c,
    eq: () => c,
    in: () => c,
    single: () => ({ data, error }),
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve({ data, error }).then(res ?? undefined),
  };
  return c;
}

const validBody = {
  wdcDriverId: 10,
  wccTeamId: 100,
  mostDnfsDriverId: 20,
  mostPodiumsDriverId: 30,
  mostWinsDriverId: 40,
};

describe("POST /api/results/champion/manual", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    setUser({ id: "u1" });
    (isAdminUser as jest.Mock).mockReturnValue(false);
    const { status } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    setAdmin();
    const { status } = await parseResponse(await POST(createBadJsonRequest()));
    expect(status).toBe(400);
  });

  it("returns 400 when wdcDriverId is missing", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ wccTeamId: 100 }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/wdcdriverid.*wccteamid.*required/i);
  });

  it("returns 400 when wdcDriverId is negative", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ wdcDriverId: -1, wccTeamId: 100 }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/positive integer/i);
  });

  it("returns 400 when wccTeamId is negative", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ wdcDriverId: 10, wccTeamId: -1 }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/positive integer/i);
  });

  it("returns 404 when no active season", async () => {
    setAdmin();
    // seasons query → null
    mockFrom.mockReturnValue(chain(null));

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(404);
    expect(json.error).toMatch(/no active season/i);
  });

  it("returns 404 when driver not found", async () => {
    setAdmin();
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 1 }); // season
      return chain(null); // driver not found
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(404);
    expect(json.error).toMatch(/driver not found/i);
  });

  it("returns 404 when team not found", async () => {
    setAdmin();
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 1 }); // season
      if (callIdx === 2) return chain({ id: 10 }); // driver found
      return chain(null); // team not found
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(404);
    expect(json.error).toMatch(/team not found/i);
  });

  it("inserts result and triggers scoring on success", async () => {
    setAdmin();
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 1 }); // seasons
      if (callIdx === 2) return chain({ id: 10 }); // drivers
      if (callIdx === 3) return chain({ id: 100 }); // teams
      if (callIdx === 4)
        return chain([
          { id: 1, slug: "wdc", subject_type: "driver", scope_team_id: null },
          { id: 2, slug: "wcc", subject_type: "team", scope_team_id: null },
          { id: 3, slug: "most_dnfs", subject_type: "driver", scope_team_id: null },
          { id: 4, slug: "most_podiums", subject_type: "driver", scope_team_id: null },
          { id: 5, slug: "most_wins", subject_type: "driver", scope_team_id: null },
        ]); // season_award_types
      return chain(null); // season_award_results existing-check + inserts
    });
    (scoreSeasonAwardsForSeason as jest.Mock).mockResolvedValue({
      seasonAwardPredictionsScored: 2,
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.source).toBe("manual");
    expect(scoreSeasonAwardsForSeason).toHaveBeenCalledWith(expect.anything(), 1);
  });
});
