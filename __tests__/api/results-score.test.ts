/**
 * Tests for POST /api/results/score
 *
 * Covers: auth guard (401), admin guard (403), missing body (400), success (200).
 */

import { NextRequest } from "next/server";

// ── Mocks ────────────────────────────────────────────────────────────

const mockGetUser = jest.fn();
const mockCreateClient = jest.fn().mockResolvedValue({
  auth: { getUser: mockGetUser },
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

import { POST } from "@/app/api/results/score/route";
import { isAdminUser } from "@/lib/admin";
import { scoreRaceForId } from "@/lib/scoring-service";
import {
  createMockRequest,
  createBadJsonRequest,
  parseResponse,
} from "../helpers/mockApiRoute";

// ── Helpers ──────────────────────────────────────────────────────────

function setUser(user: { id: string; app_metadata?: Record<string, unknown> } | null) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

// ── Tests ────────────────────────────────────────────────────────────

describe("POST /api/results/score", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    setUser(null);
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 1 }))
    );
    expect(status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 403 when user is not admin", async () => {
    setUser({ id: "user-1" });
    (isAdminUser as jest.Mock).mockReturnValue(false);

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 1 }))
    );
    expect(status).toBe(403);
    expect(json.error).toMatch(/forbidden/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    setUser({ id: "admin-1", app_metadata: { role: "admin" } });
    (isAdminUser as jest.Mock).mockReturnValue(true);

    const { status, json } = await parseResponse(
      await POST(createBadJsonRequest())
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/invalid json/i);
  });

  it("returns 400 when raceId is missing", async () => {
    setUser({ id: "admin-1", app_metadata: { role: "admin" } });
    (isAdminUser as jest.Mock).mockReturnValue(true);

    const { status, json } = await parseResponse(
      await POST(createMockRequest({}))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/raceid.*required/i);
  });

  it("returns 200 and delegates to scoreRaceForId on success", async () => {
    setUser({ id: "admin-1", app_metadata: { role: "admin" } });
    (isAdminUser as jest.Mock).mockReturnValue(true);
    (scoreRaceForId as jest.Mock).mockResolvedValue({
      racePredictionsScored: 5,
      sprintPredictionsScored: 2,
    });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 42 }))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.racePredictionsScored).toBe(5);
    expect(json.sprintPredictionsScored).toBe(2);
    expect(scoreRaceForId).toHaveBeenCalledWith(expect.anything(), 42);
  });
});
