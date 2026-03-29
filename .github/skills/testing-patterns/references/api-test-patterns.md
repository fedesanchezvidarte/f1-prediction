# API Test Patterns

## Full API Route Test Template

### Standard Authenticated Route

```typescript
// __tests__/api/predictions-submit.test.ts
import { POST } from "@/app/api/predictions/submit/route";
import {
  createMockRequest,
  createBadJsonRequest,
  parseResponse,
  buildMockCreateClient,
} from "../helpers/mockApiRoute";
import { createClient } from "@/lib/supabase/server";

// Mock Supabase server
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

describe("POST /api/predictions/submit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Security: 401 Unauthenticated ---
  it("should return 401 when user is not authenticated", async () => {
    const { createClient: mockCreate } = buildMockCreateClient(null);
    (createClient as jest.Mock).mockImplementation(mockCreate);

    const req = createMockRequest({ raceId: 1 });
    const res = await POST(req);
    const { status, json } = await parseResponse(res);

    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  // --- Validation: 400 Bad JSON ---
  it("should return 400 when body is not valid JSON", async () => {
    const { createClient: mockCreate } = buildMockCreateClient({
      id: "user-1",
      app_metadata: {},
    });
    (createClient as jest.Mock).mockImplementation(mockCreate);

    const req = createBadJsonRequest();
    const res = await POST(req);
    const { status, json } = await parseResponse(res);

    expect(status).toBe(400);
    expect(json.error).toBeDefined();
  });

  // --- Validation: 400 Missing Fields ---
  it("should return 400 when raceId is missing", async () => {
    const { createClient: mockCreate } = buildMockCreateClient({
      id: "user-1",
      app_metadata: {},
    });
    (createClient as jest.Mock).mockImplementation(mockCreate);

    const req = createMockRequest({ top10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    const res = await POST(req);
    const { status, json } = await parseResponse(res);

    expect(status).toBe(400);
    expect(json.error).toContain("raceId");
  });

  // --- Happy Path: 200 Success ---
  it("should return 200 on valid submission", async () => {
    const { createClient: mockCreate, mockSupabase } = buildMockCreateClient({
      id: "user-1",
      app_metadata: {},
    });
    (createClient as jest.Mock).mockImplementation(mockCreate);

    // Mock the upsert call
    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    });

    const req = createMockRequest({
      raceId: 1,
      top10: [1, 44, 16, 55, 4, 63, 81, 11, 14, 22],
      polePosition: 1,
      fastestLap: 44,
    });
    const res = await POST(req);
    const { status, json } = await parseResponse(res);

    expect(status).toBe(200);
    expect(json.success).toBe(true);
  });
});
```

### Admin-Only Route

```typescript
// __tests__/api/results-manual.test.ts
import { POST } from "@/app/api/results/manual/route";
import {
  createMockRequest,
  createBadJsonRequest,
  parseResponse,
  buildMockCreateClient,
} from "../helpers/mockApiRoute";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/admin", () => ({
  isAdminUser: jest.fn(),
}));

describe("POST /api/results/manual", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Security: 401 ---
  it("should return 401 when not authenticated", async () => {
    const { createClient: mockCreate } = buildMockCreateClient(null);
    (createClient as jest.Mock).mockImplementation(mockCreate);

    const req = createMockRequest({ raceId: 1 });
    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });

  // --- Security: 403 Non-Admin ---
  it("should return 403 when user is not admin", async () => {
    const { createClient: mockCreate } = buildMockCreateClient({
      id: "user-1",
      app_metadata: {},
    });
    (createClient as jest.Mock).mockImplementation(mockCreate);
    (isAdminUser as jest.Mock).mockReturnValue(false);

    const req = createMockRequest({ raceId: 1 });
    const res = await POST(req);
    const { status, json } = await parseResponse(res);

    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  // --- Validation: 400 ---
  it("should return 400 when raceId is missing", async () => {
    const { createClient: mockCreate } = buildMockCreateClient({
      id: "admin-1",
      app_metadata: { role: "admin" },
    });
    (createClient as jest.Mock).mockImplementation(mockCreate);
    (isAdminUser as jest.Mock).mockReturnValue(true);

    const req = createMockRequest({});
    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(400);
  });

  // --- Happy Path: 200 ---
  it("should return 200 when admin submits valid result", async () => {
    const { createClient: mockCreate, mockSupabase } = buildMockCreateClient({
      id: "admin-1",
      app_metadata: { role: "admin" },
    });
    (createClient as jest.Mock).mockImplementation(mockCreate);
    (isAdminUser as jest.Mock).mockReturnValue(true);

    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    });

    const req = createMockRequest({
      raceId: 1,
      polePosition: 1,
      raceWinner: 1,
      top10: [1, 44, 16, 55, 4, 63, 81, 11, 14, 22],
      fastestLap: 1,
      fastestPitStop: 44,
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);

    expect(status).toBe(200);
  });
});
```

## Test Coverage Checklist for API Routes

For every API route, ensure these test cases exist:

### Authenticated Routes
- [ ] 401 — No user (unauthenticated)
- [ ] 400 — Malformed JSON body
- [ ] 400 — Missing required fields
- [ ] 200/201 — Valid request with correct data

### Admin-Only Routes (all of the above plus)
- [ ] 403 — Authenticated but not admin
- [ ] 200 — Admin with valid request

### Service Delegation Routes
- [ ] 500 — Service function throws an error
- [ ] 200 — Service function succeeds and returns expected shape

## Helper Function Reference

| Helper | Purpose | Import from |
|---|---|---|
| `createMockRequest(body)` | Create `NextRequest` with JSON body | `mockApiRoute.ts` |
| `createBadJsonRequest()` | Create `NextRequest` with invalid JSON | `mockApiRoute.ts` |
| `parseResponse(res)` | Extract `{ status, json }` from `NextResponse` | `mockApiRoute.ts` |
| `buildMockCreateClient(user)` | Mock Supabase with auth guard | `mockApiRoute.ts` |
| `buildMockSupabaseForApi()` | Lightweight chain mock for API tests | `mockApiRoute.ts` |
