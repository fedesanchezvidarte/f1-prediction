/**
 * Tests for app/api/admin/drivers/route.ts — PATCH.
 *
 * Covers auth (401), admin (403), input validation (400), the happy path (200)
 * and the lib-error / thrown-error paths (500).
 *
 * `isAdminUser` is the real implementation, driven by the mocked user's
 * `app_metadata.role`. The write goes through `createAdminClient`, so both
 * Supabase factories are mocked.
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

jest.mock("@f1/shared/lib/drivers", () => ({
  setDriverActive: jest.fn(),
}));

import { PATCH } from "@/app/api/admin/drivers/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { setDriverActive } from "@f1/shared/lib/drivers";
import {
  createBadJsonRequest,
  createMockRequest,
  parseResponse,
} from "../helpers/mockApiRoute";

const ROUTE = "http://localhost/api/admin/drivers";

function setUser(user: { id: string; app_metadata?: Record<string, unknown> } | null) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setAdmin() {
  setUser({ id: "admin-1", app_metadata: { role: "admin" } });
}

function request(body: unknown) {
  return createMockRequest(body, ROUTE);
}

let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  // Keep the real isAdminUser deterministic — no env-var admin backdoor.
  delete process.env.ADMIN_USER_IDS;
});

beforeEach(() => {
  jest.clearAllMocks();
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  (setDriverActive as jest.Mock).mockResolvedValue({ error: null });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("PATCH /api/admin/drivers", () => {
  it("returns 401 when the request is unauthenticated", async () => {
    setUser(null);
    const { status, json } = await parseResponse(
      await PATCH(request({ driverId: 101, isActive: false }))
    );

    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(setDriverActive).not.toHaveBeenCalled();
  });

  it("returns 403 when the authenticated user is not an admin", async () => {
    setUser({ id: "user-1", app_metadata: { role: "user" } });
    const { status, json } = await parseResponse(
      await PATCH(request({ driverId: 101, isActive: false }))
    );

    expect(status).toBe(403);
    expect(json.error).toMatch(/admin/i);
    expect(setDriverActive).not.toHaveBeenCalled();
  });

  it("returns 403 when the user has no app_metadata role at all", async () => {
    setUser({ id: "user-2" });
    const { status } = await parseResponse(
      await PATCH(request({ driverId: 101, isActive: false }))
    );
    expect(status).toBe(403);
  });

  it("returns 400 for an invalid JSON body", async () => {
    setAdmin();
    const { status, json } = await parseResponse(await PATCH(createBadJsonRequest(ROUTE)));

    expect(status).toBe(400);
    expect(json.error).toBe("Invalid JSON body");
  });

  it("returns 400 when driverId is missing", async () => {
    setAdmin();
    const { status, json } = await parseResponse(await PATCH(request({ isActive: true })));

    expect(status).toBe(400);
    expect(json.error).toMatch(/driverid.*positive integer/i);
  });

  it("returns 400 when driverId is not a number", async () => {
    setAdmin();
    const { status } = await parseResponse(
      await PATCH(request({ driverId: "101", isActive: true }))
    );
    expect(status).toBe(400);
  });

  it("returns 400 when driverId is not an integer", async () => {
    setAdmin();
    const { status } = await parseResponse(
      await PATCH(request({ driverId: 10.5, isActive: true }))
    );
    expect(status).toBe(400);
  });

  it("returns 400 when driverId is zero or negative", async () => {
    setAdmin();
    expect(
      (await parseResponse(await PATCH(request({ driverId: 0, isActive: true })))).status
    ).toBe(400);
    expect(
      (await parseResponse(await PATCH(request({ driverId: -5, isActive: true })))).status
    ).toBe(400);
  });

  it("returns 400 when isActive is not a boolean", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await PATCH(request({ driverId: 101, isActive: "false" }))
    );

    expect(status).toBe(400);
    expect(json.error).toMatch(/isactive.*boolean/i);
  });

  it("returns 400 when isActive is missing", async () => {
    setAdmin();
    const { status } = await parseResponse(await PATCH(request({ driverId: 101 })));
    expect(status).toBe(400);
  });

  it("returns 200 and deactivates the driver on the service-role client", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await PATCH(request({ driverId: 101, isActive: false }))
    );

    expect(status).toBe(200);
    expect(json).toEqual({ success: true, driverId: 101, isActive: false });
    expect(createAdminClient).toHaveBeenCalled();
    expect(setDriverActive).toHaveBeenCalledWith(mockAdminClient, 101, false);
  });

  it("returns 200 and reactivates the driver", async () => {
    setAdmin();
    const { status, json } = await parseResponse(
      await PATCH(request({ driverId: 102, isActive: true }))
    );

    expect(status).toBe(200);
    expect(json).toEqual({ success: true, driverId: 102, isActive: true });
    expect(setDriverActive).toHaveBeenCalledWith(mockAdminClient, 102, true);
  });

  it("returns 500 when the update reports an error", async () => {
    setAdmin();
    (setDriverActive as jest.Mock).mockResolvedValue({ error: "permission denied" });

    const { status, json } = await parseResponse(
      await PATCH(request({ driverId: 101, isActive: false }))
    );
    expect(status).toBe(500);
    expect(json.error).toBe("permission denied");
  });

  it("returns 500 when the update throws", async () => {
    setAdmin();
    (setDriverActive as jest.Mock).mockRejectedValue(new Error("boom"));

    const { status, json } = await parseResponse(
      await PATCH(request({ driverId: 101, isActive: false }))
    );
    expect(status).toBe(500);
    expect(json.error).toBe("Internal server error");
  });
});
