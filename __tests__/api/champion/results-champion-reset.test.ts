/**
 * Tests for POST /api/results/champion/reset
 *
 * Covers: auth (401), admin (403), no season (404), success path.
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
  updateLeaderboard: jest.fn().mockResolvedValue(undefined),
}));

import { POST } from "@/app/api/results/champion/reset/route";
import { isAdminUser } from "@/lib/admin";
import { parseResponse } from "../../helpers/mockApiRoute";

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
    delete: () => c,
    eq: () => c,
    in: () => c,
    single: () => ({ data, error }),
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve({ data, error }).then(res ?? undefined),
  };
  return c;
}

describe("POST /api/results/champion/reset", () => {
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

  it("reverts predictions, deletes results, and updates leaderboard", async () => {
    setAdmin();
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // seasons
        return chain({ id: 1 });
      }
      if (callIdx === 2) {
        // champion_predictions select scored
        return chain(null, null);
      }
      // The rest: scoresTbd, updates, deletes
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              then: (res: ((v: unknown) => unknown) | null) =>
                Promise.resolve({
                  data: [{ id: 1, user_id: "u-a" }],
                  error: null,
                }).then(res ?? undefined),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              then: (res: ((v: unknown) => unknown) | null) =>
                Promise.resolve({ data: null, error: null }).then(
                  res ?? undefined
                ),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            then: (res: ((v: unknown) => unknown) | null) =>
              Promise.resolve({ data: null, error: null }).then(
                res ?? undefined
              ),
          }),
        }),
      };
    });

    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 500 when deleting champion results fails", async () => {
    setAdmin();
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 1 }); // season

      // All subsequent queries: scored preds empty, delete fails
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              then: (res: ((v: unknown) => unknown) | null) =>
                Promise.resolve({ data: [], error: null }).then(
                  res ?? undefined
                ),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            then: (res: ((v: unknown) => unknown) | null) =>
              Promise.resolve({
                data: null,
                error: { message: "FK constraint" },
              }).then(res ?? undefined),
          }),
        }),
      };
    });

    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(500);
    expect(json.error).toMatch(/failed/i);
  });
});
