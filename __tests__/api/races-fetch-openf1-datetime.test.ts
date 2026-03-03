/**
 * Tests for POST /api/races/fetch-openf1-datetime
 *
 * Covers: auth (401), admin (403), body validation (400), race not found (404).
 * External OpenF1 API calls are not deeply tested — only auth/validation guards.
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

import { POST } from "@/app/api/races/fetch-openf1-datetime/route";
import { isAdminUser } from "@/lib/admin";
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

describe("POST /api/races/fetch-openf1-datetime", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(
      await POST(createMockRequest({ raceId: 1 }))
    );
    expect(status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    setUser({ id: "u1" });
    (isAdminUser as jest.Mock).mockReturnValue(false);
    const { status } = await parseResponse(
      await POST(createMockRequest({ raceId: 1 }))
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
      await POST(createMockRequest({}))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/raceid.*required/i);
  });

  it("returns 404 when race not found in DB", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain(null));

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 999 }))
    );
    expect(status).toBe(404);
    expect(json.error).toMatch(/race not found/i);
  });

  it("returns 500 when season year cannot be determined", async () => {
    setAdmin();
    mockFrom.mockReturnValue(
      chain({
        circuit_short_name: "monza",
        country_name: "Italy",
        has_sprint: false,
        seasons: null,
      })
    );

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 1 }))
    );
    expect(status).toBe(500);
    expect(json.error).toMatch(/season year/i);
  });
});
