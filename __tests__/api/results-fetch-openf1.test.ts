/**
 * Tests for POST /api/results/fetch-openf1
 *
 * Covers: auth (401), admin (403), body validation (400).
 * External OpenF1 API is not deeply tested — only auth/validation guards.
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

import { POST } from "@/app/api/results/fetch-openf1/route";
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

describe("POST /api/results/fetch-openf1", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status } = await parseResponse(
      await POST(createMockRequest({ meetingKey: 1, sessionType: "race" }))
    );
    expect(status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    setUser({ id: "u1" });
    (isAdminUser as jest.Mock).mockReturnValue(false);
    const { status } = await parseResponse(
      await POST(createMockRequest({ meetingKey: 1, sessionType: "race" }))
    );
    expect(status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    setAdmin();
    const { status } = await parseResponse(await POST(createBadJsonRequest()));
    expect(status).toBe(400);
  });

  it("returns 400 when meetingKey or sessionType is missing", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ meetingKey: 1 }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/required/i);
  });

  it("returns 400 when both meetingKey and sessionType are missing", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({}))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/required/i);
  });
});
