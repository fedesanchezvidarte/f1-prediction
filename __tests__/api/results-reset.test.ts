/**
 * Tests for POST /api/results/reset
 *
 * Covers: auth (401), admin (403), input validation (400),
 * race reset path, sprint reset path.
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

import { POST } from "@/app/api/results/reset/route";
import { isAdminUser } from "@/lib/admin";
import { updateLeaderboard } from "@/lib/scoring-service";
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

function chain(overrides: Record<string, unknown> = {}) {
  const c: Record<string, unknown> = {
    select: () => c,
    update: () => c,
    delete: () => c,
    eq: () => c,
    in: () => c,
    single: () => ({ data: null, error: null }),
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve({ data: null, error: null }).then(res ?? undefined),
    ...overrides,
  };
  return c;
}

describe("POST /api/results/reset", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(
      await POST(createMockRequest({ raceId: 1, sessionType: "race" }))
    );
    expect(status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    setUser({ id: "u1" });
    (isAdminUser as jest.Mock).mockReturnValue(false);
    const { status } = await parseResponse(
      await POST(createMockRequest({ raceId: 1, sessionType: "race" }))
    );
    expect(status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    setAdmin();
    const { status } = await parseResponse(await POST(createBadJsonRequest()));
    expect(status).toBe(400);
  });

  it("returns 400 when raceId is missing", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ sessionType: "race" }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/raceid.*positive integer/i);
  });

  it("returns 400 when raceId is not a positive integer", async () => {
    setAdmin();
    const { status } = await parseResponse(
      await POST(createMockRequest({ raceId: -1, sessionType: "race" }))
    );
    expect(status).toBe(400);
  });

  it("returns 400 when sessionType is invalid", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 1, sessionType: "qualifying" }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/sessiontype/i);
  });

  it("resets race result, reverts predictions, and updates leaderboard", async () => {
    setAdmin();
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        // race_predictions select scored
        return chain({
          then: (res: ((v: unknown) => unknown) | null) =>
            Promise.resolve({
              data: [{ id: 1, user_id: "u-a" }, { id: 2, user_id: "u-b" }],
              error: null,
            }).then(res ?? undefined),
        });
      }
      // update, delete — all succeed
      return chain();
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 10, sessionType: "race" }))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.predictionsReverted).toBe(2);
    expect(updateLeaderboard).toHaveBeenCalled();
  });

  it("resets sprint result and updates leaderboard", async () => {
    setAdmin();
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return chain({
          then: (res: ((v: unknown) => unknown) | null) =>
            Promise.resolve({
              data: [{ id: 3, user_id: "u-c" }],
              error: null,
            }).then(res ?? undefined),
        });
      }
      return chain();
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 20, sessionType: "sprint" }))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.predictionsReverted).toBe(1);
    expect(updateLeaderboard).toHaveBeenCalled();
  });

  it("skips leaderboard update when no predictions were scored", async () => {
    setAdmin();
    mockFrom.mockImplementation(() =>
      chain({
        then: (res: ((v: unknown) => unknown) | null) =>
          Promise.resolve({ data: [], error: null }).then(res ?? undefined),
      })
    );

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 30, sessionType: "race" }))
    );
    expect(status).toBe(200);
    expect(json.predictionsReverted).toBe(0);
    expect(updateLeaderboard).not.toHaveBeenCalled();
  });
});
