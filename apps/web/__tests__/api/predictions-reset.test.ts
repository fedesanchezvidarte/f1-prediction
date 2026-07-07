/**
 * Tests for POST /api/predictions/reset
 *
 * Covers: auth (401), invalid JSON (400), invalid type (400),
 * race/sprint/champion reset paths, scored prediction guard.
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

import { POST } from "@/app/api/predictions/reset/route";
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
    eq: () => c,
    in: () => c,
    order: () => c,
    single: () => ({ data, error }),
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve({ data, error }).then(res ?? undefined),
  };
  return c;
}

describe("POST /api/predictions/reset", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(
      await POST(createMockRequest({ type: "race", raceId: 1 }))
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

  it("returns 400 for unknown type", async () => {
    setUser({ id: "u1" });
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ type: "qualifying" }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid type/i);
  });

  // ── Race reset ──────────────────────────────────────────────────────

  it("returns success when race not found by meetingKey", async () => {
    setUser({ id: "u1" });
    mockFrom.mockReturnValue(chain(null));

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ type: "race", raceId: 999 }))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns success when no existing race prediction to reset", async () => {
    setUser({ id: "u1" });
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 42 }); // race lookup
      return chain(null); // no prediction
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ type: "race", raceId: 1 }))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 when trying to reset a scored race prediction", async () => {
    setUser({ id: "u1" });
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 42 }); // race lookup
      return chain({ id: 1, status: "scored" }); // scored prediction
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ type: "race", raceId: 1 }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/scored/i);
  });

  // ── Sprint reset ────────────────────────────────────────────────────

  it("returns 400 when trying to reset a scored sprint prediction", async () => {
    setUser({ id: "u1" });
    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 42 }); // race lookup
      return chain({ id: 2, status: "scored" });
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ type: "sprint", raceId: 1 }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/scored/i);
  });

  // ── Champion reset ──────────────────────────────────────────────────

  it("returns 403 for champion reset (season predictions cannot be reset)", async () => {
    setUser({ id: "u1" });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ type: "champion" }))
    );
    expect(status).toBe(403);
    expect(json.error).toMatch(/season predictions cannot be reset/i);
  });

  it("returns 403 for teamBestDriver reset (season predictions cannot be reset)", async () => {
    setUser({ id: "u1" });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ type: "teamBestDriver" }))
    );
    expect(status).toBe(403);
    expect(json.error).toMatch(/season predictions cannot be reset/i);
  });
});
