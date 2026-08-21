/**
 * Tests for app/api/admin/lineup/route.ts — GET / PUT / DELETE.
 *
 * Covers auth (401), admin (403), input validation (400), the happy path (200)
 * and the lib-error / thrown-error paths (500) for each verb.
 *
 * `isAdminUser` is the real implementation, driven by the mocked user's
 * `app_metadata.role`. Writes go through `createAdminClient`, so both Supabase
 * factories are mocked.
 */

const mockGetUser = jest.fn();
const mockCreateClient = jest.fn().mockResolvedValue({
  auth: { getUser: mockGetUser },
  from: jest.fn(),
});
const mockAdminClient = { __serviceRole: true };

jest.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

jest.mock("@f1/shared/lib/lineup", () => ({
  fetchLineupRoster: jest.fn(),
  upsertLineupOverride: jest.fn(),
  deleteLineupOverride: jest.fn(),
}));

import { DELETE, GET, PUT } from "@/app/api/admin/lineup/route";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteLineupOverride,
  fetchLineupRoster,
  upsertLineupOverride,
} from "@f1/shared/lib/lineup";
import {
  createBadJsonRequest,
  createMockRequest,
  parseResponse,
} from "../helpers/mockApiRoute";

const ROUTE = "http://localhost/api/admin/lineup";

const ROSTER_ENTRY = {
  driverId: 101,
  driverNumber: 1,
  firstName: "Max",
  lastName: "Verstappen",
  nameAcronym: "VER",
  seasonTeamId: 10,
  seasonTeamName: "Red Bull",
  isActive: true,
  override: null,
};

function setUser(user: { id: string; app_metadata?: Record<string, unknown> } | null) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setAdmin() {
  setUser({ id: "admin-1", app_metadata: { role: "admin" } });
}

function setPlainUser() {
  setUser({ id: "user-1", app_metadata: { role: "user" } });
}

/** GET request carrying `raceId` in the query string. */
function getRequest(raceId?: string) {
  const url = raceId === undefined ? ROUTE : `${ROUTE}?raceId=${raceId}`;
  return createMockRequest(undefined, url);
}

function putRequest(body: unknown) {
  return createMockRequest(body, ROUTE);
}

const VALID_PUT_BODY = {
  raceId: 501,
  driverId: 101,
  isUnavailable: true,
  teamId: null,
  note: "Injured",
};

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  // Keep the real isAdminUser deterministic — no env-var admin backdoor.
  delete process.env.ADMIN_USER_IDS;
});

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  (fetchLineupRoster as jest.Mock).mockResolvedValue([ROSTER_ENTRY]);
  (upsertLineupOverride as jest.Mock).mockResolvedValue({ error: null, deleted: false });
  (deleteLineupOverride as jest.Mock).mockResolvedValue({ error: null });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

/* ── GET ────────────────────────────────────────────────────────────────── */

describe("GET /api/admin/lineup", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    setUser(null);
    const { status, json } = await parseResponse(await GET(getRequest("501")));

    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(fetchLineupRoster).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user is not an admin", async () => {
    setPlainUser();
    const { status, json } = await parseResponse(await GET(getRequest("501")));

    expect(status).toBe(403);
    expect(json.error).toMatch(/admin/i);
    expect(fetchLineupRoster).not.toHaveBeenCalled();
  });

  it("returns 400 when raceId is missing from the query string", async () => {
    setAdmin();
    const { status, json } = await parseResponse(await GET(getRequest()));

    expect(status).toBe(400);
    expect(json.error).toMatch(/raceid.*positive integer/i);
  });

  it("returns 400 when raceId is not a number", async () => {
    setAdmin();
    const { status } = await parseResponse(await GET(getRequest("abc")));
    expect(status).toBe(400);
  });

  it("returns 400 when raceId is not an integer", async () => {
    setAdmin();
    const { status } = await parseResponse(await GET(getRequest("1.5")));
    expect(status).toBe(400);
  });

  it("returns 400 when raceId is zero", async () => {
    setAdmin();
    const { status } = await parseResponse(await GET(getRequest("0")));
    expect(status).toBe(400);
  });

  it("returns 400 when raceId is negative", async () => {
    setAdmin();
    const { status } = await parseResponse(await GET(getRequest("-3")));
    expect(status).toBe(400);
  });

  it("returns 200 with the roster for the requested race", async () => {
    setAdmin();
    const { status, json } = await parseResponse(await GET(getRequest("501")));

    expect(status).toBe(200);
    expect(json).toEqual({ raceId: 501, roster: [ROSTER_ENTRY] });
    expect(fetchLineupRoster).toHaveBeenCalledWith(expect.anything(), 501);
  });

  it("returns 500 when the roster fetch throws", async () => {
    setAdmin();
    (fetchLineupRoster as jest.Mock).mockRejectedValue(new Error("db down"));

    const { status, json } = await parseResponse(await GET(getRequest("501")));
    expect(status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});

/* ── PUT ────────────────────────────────────────────────────────────────── */

describe("PUT /api/admin/lineup", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    setUser(null);
    const { status, json } = await parseResponse(await PUT(putRequest(VALID_PUT_BODY)));

    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(upsertLineupOverride).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user is not an admin", async () => {
    setPlainUser();
    const { status, json } = await parseResponse(await PUT(putRequest(VALID_PUT_BODY)));

    expect(status).toBe(403);
    expect(json.error).toMatch(/admin/i);
    expect(upsertLineupOverride).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid JSON body", async () => {
    setAdmin();
    const { status, json } = await parseResponse(await PUT(createBadJsonRequest(ROUTE)));

    expect(status).toBe(400);
    expect(json.error).toBe("Invalid JSON body");
  });

  it("returns 400 when raceId is missing", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await PUT(putRequest({ ...VALID_PUT_BODY, raceId: undefined }))
    );

    expect(status).toBe(400);
    expect(json.error).toMatch(/raceid/i);
  });

  it("returns 400 when raceId is not an integer", async () => {
    setAdmin();
    const { status } = await parseResponse(
      await PUT(putRequest({ ...VALID_PUT_BODY, raceId: 1.5 }))
    );
    expect(status).toBe(400);
  });

  it("returns 400 when raceId is a numeric string", async () => {
    setAdmin();
    const { status } = await parseResponse(
      await PUT(putRequest({ ...VALID_PUT_BODY, raceId: "501" }))
    );
    expect(status).toBe(400);
  });

  it("returns 400 when raceId is zero or negative", async () => {
    setAdmin();
    expect(
      (await parseResponse(await PUT(putRequest({ ...VALID_PUT_BODY, raceId: 0 })))).status
    ).toBe(400);
    expect(
      (await parseResponse(await PUT(putRequest({ ...VALID_PUT_BODY, raceId: -1 })))).status
    ).toBe(400);
  });

  it("returns 400 when driverId is missing or not a positive integer", async () => {
    setAdmin();
    const missing = await parseResponse(
      await PUT(putRequest({ ...VALID_PUT_BODY, driverId: undefined }))
    );
    expect(missing.status).toBe(400);
    expect(missing.json.error).toMatch(/driverid/i);

    expect(
      (await parseResponse(await PUT(putRequest({ ...VALID_PUT_BODY, driverId: 0 })))).status
    ).toBe(400);
    expect(
      (await parseResponse(await PUT(putRequest({ ...VALID_PUT_BODY, driverId: "101" })))).status
    ).toBe(400);
  });

  it("returns 400 when isUnavailable is not a boolean", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await PUT(putRequest({ ...VALID_PUT_BODY, isUnavailable: "true" }))
    );

    expect(status).toBe(400);
    expect(json.error).toMatch(/isunavailable.*boolean/i);
  });

  it("returns 400 when isUnavailable is missing", async () => {
    setAdmin();
    const { status } = await parseResponse(
      await PUT(putRequest({ ...VALID_PUT_BODY, isUnavailable: undefined }))
    );
    expect(status).toBe(400);
  });

  it("returns 400 when teamId is neither null nor a positive integer", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await PUT(putRequest({ ...VALID_PUT_BODY, teamId: 1.5 }))
    );

    expect(status).toBe(400);
    expect(json.error).toMatch(/teamid/i);

    expect(
      (await parseResponse(await PUT(putRequest({ ...VALID_PUT_BODY, teamId: "10" })))).status
    ).toBe(400);
    expect(
      (await parseResponse(await PUT(putRequest({ ...VALID_PUT_BODY, teamId: -2 })))).status
    ).toBe(400);
  });

  it("returns 400 when note is neither null nor a string", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await PUT(putRequest({ ...VALID_PUT_BODY, note: 42 }))
    );

    expect(status).toBe(400);
    expect(json.error).toMatch(/note.*string/i);
  });

  it("returns 200 and upserts the override on the service-role client", async () => {
    setAdmin();
    const { status, json } = await parseResponse(await PUT(putRequest(VALID_PUT_BODY)));

    expect(status).toBe(200);
    expect(json).toEqual({ success: true, deleted: false });
    expect(createAdminClient).toHaveBeenCalled();
    expect(upsertLineupOverride).toHaveBeenCalledWith(mockAdminClient, {
      raceId: 501,
      driverId: 101,
      isUnavailable: true,
      teamId: null,
      note: "Injured",
    });
  });

  it("accepts a team-only override and normalises a missing note to null", async () => {
    setAdmin();
    const { status } = await parseResponse(
      await PUT(putRequest({ raceId: 501, driverId: 101, isUnavailable: false, teamId: 20 }))
    );

    expect(status).toBe(200);
    expect(upsertLineupOverride).toHaveBeenCalledWith(mockAdminClient, {
      raceId: 501,
      driverId: 101,
      isUnavailable: false,
      teamId: 20,
      note: null,
    });
  });

  it("reports deleted: true when the override described no deviation", async () => {
    setAdmin();
    (upsertLineupOverride as jest.Mock).mockResolvedValue({ error: null, deleted: true });

    const { status, json } = await parseResponse(
      await PUT(
        putRequest({
          raceId: 501,
          driverId: 101,
          isUnavailable: false,
          teamId: null,
          note: null,
        })
      )
    );

    expect(status).toBe(200);
    expect(json).toEqual({ success: true, deleted: true });
  });

  it("returns 500 when the upsert reports an error", async () => {
    setAdmin();
    (upsertLineupOverride as jest.Mock).mockResolvedValue({
      error: "rls denied",
      deleted: false,
    });

    const { status, json } = await parseResponse(await PUT(putRequest(VALID_PUT_BODY)));
    expect(status).toBe(500);
    expect(json.error).toBe("rls denied");
  });

  it("returns 500 when the upsert throws", async () => {
    setAdmin();
    (upsertLineupOverride as jest.Mock).mockRejectedValue(new Error("boom"));

    const { status, json } = await parseResponse(await PUT(putRequest(VALID_PUT_BODY)));
    expect(status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});

/* ── DELETE ─────────────────────────────────────────────────────────────── */

describe("DELETE /api/admin/lineup", () => {
  const VALID_BODY = { raceId: 501, driverId: 101 };

  it("returns 401 when the request is unauthenticated", async () => {
    setUser(null);
    const { status, json } = await parseResponse(await DELETE(putRequest(VALID_BODY)));

    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(deleteLineupOverride).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user is not an admin", async () => {
    setPlainUser();
    const { status, json } = await parseResponse(await DELETE(putRequest(VALID_BODY)));

    expect(status).toBe(403);
    expect(json.error).toMatch(/admin/i);
    expect(deleteLineupOverride).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid JSON body", async () => {
    setAdmin();
    const { status, json } = await parseResponse(await DELETE(createBadJsonRequest(ROUTE)));

    expect(status).toBe(400);
    expect(json.error).toBe("Invalid JSON body");
  });

  it("returns 400 when raceId is missing or not a positive integer", async () => {
    setAdmin();
    const missing = await parseResponse(await DELETE(putRequest({ driverId: 101 })));
    expect(missing.status).toBe(400);
    expect(missing.json.error).toMatch(/raceid/i);

    expect(
      (await parseResponse(await DELETE(putRequest({ raceId: -1, driverId: 101 })))).status
    ).toBe(400);
  });

  it("returns 400 when driverId is missing or not a positive integer", async () => {
    setAdmin();
    const missing = await parseResponse(await DELETE(putRequest({ raceId: 501 })));
    expect(missing.status).toBe(400);
    expect(missing.json.error).toMatch(/driverid/i);

    expect(
      (await parseResponse(await DELETE(putRequest({ raceId: 501, driverId: 0 })))).status
    ).toBe(400);
  });

  it("returns 200 and deletes the override on the service-role client", async () => {
    setAdmin();
    const { status, json } = await parseResponse(await DELETE(putRequest(VALID_BODY)));

    expect(status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(createAdminClient).toHaveBeenCalled();
    expect(deleteLineupOverride).toHaveBeenCalledWith(mockAdminClient, 501, 101);
  });

  it("returns 500 when the delete reports an error", async () => {
    setAdmin();
    (deleteLineupOverride as jest.Mock).mockResolvedValue({ error: "rls denied" });

    const { status, json } = await parseResponse(await DELETE(putRequest(VALID_BODY)));
    expect(status).toBe(500);
    expect(json.error).toBe("rls denied");
  });

  it("returns 500 when the delete throws", async () => {
    setAdmin();
    (deleteLineupOverride as jest.Mock).mockRejectedValue(new Error("boom"));

    const { status, json } = await parseResponse(await DELETE(putRequest(VALID_BODY)));
    expect(status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});
