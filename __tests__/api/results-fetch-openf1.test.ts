/**
 * Tests for POST /api/results/fetch-openf1
 *
 * Covers: auth (401), admin (403), body validation (400), and happy paths for
 * race and sprint session types (which exercise the OpenF1 fetch pipeline and
 * the driver-number-to-id mapping logic).
 * All external HTTP calls and Supabase queries are fully mocked.
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
import { scoreRaceForId } from "@/lib/scoring-service";
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

/* ── Helpers for happy-path tests ────────────────────────────────────── */

function chain(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    select: () => c,
    update: () => c,
    insert: () => c,
    eq: () => c,
    single: () => ({ data, error }),
    then: (res: ((v: unknown) => unknown) | null) =>
      Promise.resolve({ data, error }).then(res ?? undefined),
  };
  return c;
}

function mockFetchResponse(json: unknown): Response {
  return { ok: true, json: async () => json } as unknown as Response;
}

/* ── Happy-path tests ────────────────────────────────────────────────── */

describe("POST /api/results/fetch-openf1 — happy paths", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it("fetches a race session and inserts results (race path)", async () => {
    setAdmin();

    jest
      .spyOn(global, "fetch")
      // 1. sessions?session_name=Race
      .mockResolvedValueOnce(mockFetchResponse([{ session_key: 100 }]))
      // 2. session_result for race
      .mockResolvedValueOnce(
        mockFetchResponse([
          { driver_number: 44, position: 1, dnf: false, dns: false, dsq: false },
          { driver_number: 1, position: 2, dnf: false, dns: false, dsq: false },
        ])
      )
      // 3. sessions?session_name=Qualifying
      .mockResolvedValueOnce(mockFetchResponse([{ session_key: 200 }]))
      // 4. starting_grid position=1
      .mockResolvedValueOnce(mockFetchResponse([{ driver_number: 44, position: 1 }]))
      // 5. laps
      .mockResolvedValueOnce(
        mockFetchResponse([{ driver_number: 44, lap_duration: 85.5, is_pit_out_lap: false }])
      )
      // 6. pit
      .mockResolvedValueOnce(
        mockFetchResponse([{ driver_number: 1, stop_duration: 2.1, pit_duration: 2.5 }])
      );

    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 1, season_id: 1 }); // races
      if (callIdx === 2) return chain([{ id: 10, driver_number: 44 }, { id: 11, driver_number: 1 }]); // drivers
      if (callIdx === 3) return chain(null); // race_results existing check
      return chain(null); // race_results insert
    });

    (scoreRaceForId as jest.Mock).mockResolvedValue({ racePredictionsScored: 0 });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ meetingKey: 1, sessionType: "race" }))
    );

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.sessionKey).toBe(100);
    expect(json.driversFound).toBe(2);
    expect(json.source).toBe("openf1");
    expect(scoreRaceForId).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it("fetches a sprint session and inserts results (sprint path)", async () => {
    setAdmin();

    jest
      .spyOn(global, "fetch")
      // 1. sessions?session_name=Sprint
      .mockResolvedValueOnce(mockFetchResponse([{ session_key: 101 }]))
      // 2. session_result for sprint
      .mockResolvedValueOnce(
        mockFetchResponse([
          { driver_number: 44, position: 1, dnf: false, dns: false, dsq: false },
          { driver_number: 1, position: 2, dnf: false, dns: false, dsq: false },
        ])
      )
      // 3. sessions?session_name=Sprint Qualifying
      .mockResolvedValueOnce(mockFetchResponse([{ session_key: 201 }]))
      // 4. starting_grid position=1
      .mockResolvedValueOnce(mockFetchResponse([{ driver_number: 44, position: 1 }]))
      // 5. laps
      .mockResolvedValueOnce(
        mockFetchResponse([{ driver_number: 1, lap_duration: 60.2, is_pit_out_lap: false }])
      );

    let callIdx = 0;
    mockFrom.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) return chain({ id: 1, season_id: 1 }); // races
      if (callIdx === 2) return chain([{ id: 10, driver_number: 44 }, { id: 11, driver_number: 1 }]); // drivers
      if (callIdx === 3) return chain(null); // sprint_results existing check
      return chain(null); // sprint_results insert
    });

    (scoreRaceForId as jest.Mock).mockResolvedValue({ racePredictionsScored: 0 });

    const { status, json } = await parseResponse(
      await POST(createMockRequest({ meetingKey: 1, sessionType: "sprint" }))
    );

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.sessionKey).toBe(101);
    expect(json.driversFound).toBe(2);
    expect(json.source).toBe("openf1");
    expect(scoreRaceForId).toHaveBeenCalledWith(expect.anything(), 1);
  });
});
