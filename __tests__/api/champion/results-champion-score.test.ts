/**
 * Tests for POST /api/results/champion/score
 *
 * Covers: auth (401), admin (403), no season (404), success delegation.
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

import { POST } from "@/app/api/results/champion/score/route";
import { isAdminUser } from "@/lib/admin";
import { scoreSeasonAwardsForSeason } from "@/lib/scoring-service";
import { parseResponse } from "../../helpers/mockApiRoute";

function setUser(user: { id: string; app_metadata?: Record<string, unknown> } | null) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setAdmin() {
  setUser({ id: "admin-1" });
  (isAdminUser as jest.Mock).mockReturnValue(true);
}

function chain(data: unknown = null) {
  const c: Record<string, unknown> = {
    select: () => c,
    eq: () => c,
    single: () => ({ data, error: null }),
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve({ data, error: null }).then(res ?? undefined),
  };
  return c;
}

describe("POST /api/results/champion/score", () => {
  beforeEach(() => jest.clearAllMocks());

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
    setAdmin();
    mockFrom.mockReturnValue(chain(null));
    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(404);
    expect(json.error).toMatch(/no active season/i);
  });

  it("delegates to scoreSeasonAwardsForSeason on success", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain({ id: 5 }));
    (scoreSeasonAwardsForSeason as jest.Mock).mockResolvedValue({
      seasonAwardPredictionsScored: 6,
    });

    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.seasonAwardPredictionsScored).toBe(6);
    expect(scoreSeasonAwardsForSeason).toHaveBeenCalledWith(expect.anything(), 5);
  });

  it("returns 500 when service throws", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain({ id: 5 }));
    (scoreSeasonAwardsForSeason as jest.Mock).mockRejectedValue(
      new Error("Scoring broke")
    );

    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(500);
    expect(json.error).toMatch(/scoring broke/i);
  });
});
