/**
 * Tests for POST /api/races/update-datetime
 *
 * Covers: auth (401), admin (403), body validation (400), date validation,
 * success path, race not found.
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

import { POST } from "@/app/api/races/update-datetime/route";
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

function chain(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    select: () => c,
    update: () => c,
    eq: () => c,
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve({ data, error }).then(res ?? undefined),
  };
  return c;
}

const validBody = {
  raceId: 1,
  dateStart: "2026-03-15T10:00:00Z",
  dateEnd: "2026-03-15T14:00:00Z",
};

describe("POST /api/races/update-datetime", () => {
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

  it("returns 400 when required fields are missing", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(createMockRequest({ raceId: 1 }))
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/required/i);
  });

  it("returns 400 when dateStart is not a valid date", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          raceId: 1,
          dateStart: "not-a-date",
          dateEnd: "2026-03-15T14:00:00Z",
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/valid date/i);
  });

  it("returns 400 when dateEnd is before dateStart", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          raceId: 1,
          dateStart: "2026-03-15T14:00:00Z",
          dateEnd: "2026-03-15T10:00:00Z",
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/dateend.*after.*datestart/i);
  });

  it("returns 404 when race update affects no rows", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain([])); // empty data array

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(404);
    expect(json.error).toMatch(/no race found/i);
  });

  it("returns 200 on success", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain([{ id: 1 }]));

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 500 when DB returns an error", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain(null, { message: "RLS violation" }));

    const { status, json } = await parseResponse(
      await POST(createMockRequest(validBody))
    );
    expect(status).toBe(500);
    expect(json.error).toMatch(/rls violation/i);
  });

  it("returns 400 when sprintDateEnd is not a valid date", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          ...validBody,
          sprintDateEnd: "not-a-date",
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/sprintDateEnd.*valid date/i);
  });

  it("returns 400 when sprintDateEnd is before dateStart", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          ...validBody,
          sprintDateEnd: "2026-03-15T09:00:00Z",
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/sprintDateEnd.*after.*dateStart/i);
  });

  it("returns 400 when sprintDateEnd is after dateEnd", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          ...validBody,
          sprintDateEnd: "2026-03-15T15:00:00Z",
        })
      )
    );
    expect(status).toBe(400);
    expect(json.error).toMatch(/sprintDateEnd.*before.*dateEnd/i);
  });

  it("returns 200 with valid sprintDateEnd", async () => {
    setAdmin();
    mockFrom.mockReturnValue(chain([{ id: 1 }]));

    const { status, json } = await parseResponse(
      await POST(
        createMockRequest({
          ...validBody,
          sprintDateEnd: "2026-03-15T12:00:00Z",
        })
      )
    );
    expect(status).toBe(200);
    expect(json.success).toBe(true);
  });
});
