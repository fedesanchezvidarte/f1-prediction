/**
 * Tests for POST /api/achievements/calculate
 *
 * Covers: auth (401), admin (403), invalid body (400), all 3 body modes,
 * input validation for raceId and userIds.
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

jest.mock("@/lib/achievement-calculator", () => ({
  calculateAchievementsForUsers: jest.fn(),
  calculateAchievementsForAllUsers: jest.fn(),
}));

import { POST } from "@/app/api/achievements/calculate/route";
import { isAdminUser } from "@/lib/admin";
import {
  calculateAchievementsForUsers,
  calculateAchievementsForAllUsers,
} from "@/lib/achievement-calculator";
import {
  createMockRequest,
  createBadJsonRequest,
  parseResponse,
} from "../helpers/mockApiRoute";

function setUser(user: { id: string; app_metadata?: Record<string, unknown> } | null) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setAdmin() {
  setUser({ id: "admin-1", app_metadata: { role: "admin" } });
  (isAdminUser as jest.Mock).mockReturnValue(true);
}

describe("POST /api/achievements/calculate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(
      await POST(createMockRequest({ all: true }))
    );
    expect(status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    setUser({ id: "u1" });
    (isAdminUser as jest.Mock).mockReturnValue(false);
    const { status } = await parseResponse(
      await POST(createMockRequest({ all: true }))
    );
    expect(status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createBadJsonRequest())
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 when body has none of raceId/userIds/all", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({}))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/provide raceid.*userids.*all/i);
  });

  // ── { all: true } mode ──────────────────────────────────────────────

  it("delegates to calculateAchievementsForAllUsers when all=true", async () => {
    setAdmin();
    (calculateAchievementsForAllUsers as jest.Mock).mockResolvedValue({
      usersProcessed: 10,
      achievementsAwarded: 3,
      achievementsRevoked: 1,
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ all: true }))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.usersProcessed).toBe(10);
    expect(calculateAchievementsForAllUsers).toHaveBeenCalledTimes(1);
  });

  // ── { raceId } mode ─────────────────────────────────────────────────

  it("returns 400 when raceId is not a positive integer", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: -5 }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/positive integer/i);
  });

  it("returns success with 0 users when no predictions for raceId", async () => {
    setAdmin();
    const mockChain: Record<string, unknown> = {
      select: () => mockChain,
      eq: () => mockChain,
      in: () => mockChain,
      then: (res: ((v: unknown) => unknown) | null) =>
        Promise.resolve({ data: [], error: null }).then(res ?? undefined),
    };
    mockFrom.mockReturnValue(mockChain);

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 5 }))
    );
    expect(status).toBe(200);
    expect(json.usersProcessed).toBe(0);
  });

  it("collects users from race+sprint predictions and delegates", async () => {
    setAdmin();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const thisCall = callCount; // capture by value
      const c: Record<string, unknown> = {
        select: () => c,
        eq: () => c,
        in: () => c,
        then: (res: ((v: unknown) => unknown) | null) => {
          const data =
            thisCall === 1
              ? { data: [{ user_id: "a" }, { user_id: "b" }], error: null }
              : { data: [{ user_id: "b" }, { user_id: "c" }], error: null };
          return Promise.resolve(data).then(res ?? undefined);
        },
      };
      return c;
    });

    (calculateAchievementsForUsers as jest.Mock).mockResolvedValue({
      usersProcessed: 3,
      achievementsAwarded: 2,
      achievementsRevoked: 0,
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 5 }))
    );
    expect(status).toBe(200);
    expect(json.usersProcessed).toBe(3);
    expect(calculateAchievementsForUsers).toHaveBeenCalledWith(
      expect.anything(),
      expect.arrayContaining(["a", "b", "c"])
    );
  });

  // ── { userIds } mode ────────────────────────────────────────────────

  it("returns 400 when userIds is empty array", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ userIds: [] }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/non-empty array/i);
  });

  it("returns 400 when userIds contains empty string", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ userIds: ["valid", ""] }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/valid non-empty string/i);
  });

  it("delegates to calculateAchievementsForUsers with sanitized IDs", async () => {
    setAdmin();
    (calculateAchievementsForUsers as jest.Mock).mockResolvedValue({
      usersProcessed: 2,
      achievementsAwarded: 1,
      achievementsRevoked: 0,
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ userIds: [" user-a ", "user-b"] }))
    );
    expect(status).toBe(200);
    expect(json.usersProcessed).toBe(2);
    expect(calculateAchievementsForUsers).toHaveBeenCalledWith(
      expect.anything(),
      ["user-a", "user-b"]
    );
  });

  // ── Error handling ──────────────────────────────────────────────────

  it("returns 500 when service function throws", async () => {
    setAdmin();
    (calculateAchievementsForAllUsers as jest.Mock).mockRejectedValue(
      new Error("DB connection lost")
    );

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ all: true }))
    );
    expect(status).toBe(500);
    expect(json.error).toMatch(/db connection lost/i);
  });
});
