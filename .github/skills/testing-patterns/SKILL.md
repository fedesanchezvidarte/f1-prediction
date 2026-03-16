---
name: testing-patterns
description: "Testing patterns for F1 Prediction: Jest/ts-jest unit tests, Supabase mock factory, API route test helpers, coverage targets, and test organization. Use when writing or modifying test files under __tests__/."
---

# Testing Patterns Skill

## Test Organization

```
__tests__/
  lib/
    scoring.test.ts              → mirrors lib/scoring.ts
    scoring-service.test.ts      → mirrors lib/scoring-service.ts
    achievement-calculator.test.ts → mirrors lib/achievement-calculator.ts
    achievements.test.ts         → mirrors lib/achievements.ts
    admin.test.ts                → mirrors lib/admin.ts
    race-utils.test.ts           → mirrors lib/race-utils.ts
    point-system.test.ts         → mirrors lib/point-system.ts
  api/
    predictions-submit.test.ts   → mirrors app/api/predictions/submit/route.ts
    results-manual.test.ts       → mirrors app/api/results/manual/route.ts
    results-score.test.ts        → mirrors app/api/results/score/route.ts
    results-score-all.test.ts    → mirrors app/api/results/score-all/route.ts
    ...
  helpers/
    mockSupabase.ts              → Chainable Supabase mock factory
    mockApiRoute.ts              → NextRequest/NextResponse helpers
```

## Mock Factories

### `createMockSupabase()` — Service Layer Tests

Used when testing files that interact with Supabase (service functions).

```typescript
import { createMockSupabase } from "../helpers/mockSupabase";

const { supabase, mockTable } = createMockSupabase();

// Queue responses for specific tables
mockTable("race_results",
  { data: { top_10: [1, 44, 16, ...] }, error: null }
);

// Call the service function under test
const result = await scoreRaceForId(supabase as any, 123);
```

### `createMockRequest()` / `parseResponse()` — API Route Tests

Used when testing route handlers.

```typescript
import { createMockRequest, parseResponse } from "../helpers/mockApiRoute";

const req = createMockRequest({ raceId: 123 });
const response = await POST(req);
const { status, json } = await parseResponse(response);

expect(status).toBe(200);
```

## Auth Mock Pattern

```typescript
jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

// Set up auth for each test
const mockUser = { id: "user-123", app_metadata: {} };
(createClient as jest.Mock).mockResolvedValue({
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: mockUser },
    }),
  },
  from: jest.fn(() => /* chain mock */),
});
```

## Admin Mock Pattern

```typescript
jest.mock("@/lib/admin", () => ({
  isAdminUser: jest.fn(),
}));

// Admin test: grant access
(isAdminUser as jest.Mock).mockReturnValue(true);

// Non-admin test: deny access
(isAdminUser as jest.Mock).mockReturnValue(false);
```

## When to Load Reference Files

- **Writing service-layer tests** → read `references/mock-patterns.md` for `createMockSupabase()` usage
- **Writing API route tests** → read `references/api-test-patterns.md` for full test templates

## Coverage Target

- **>80% line coverage** for all files in `lib/`
- Run with: `npx jest --coverage`
- Coverage reports in `coverage/` directory

## Test Categories

Every test file should cover these categories where applicable:

| Category | What to test | Example |
|---|---|---|
| **Happy path** | Normal usage with valid inputs | Score a prediction with matching results |
| **Boundary** | Min/max values, empty arrays, edge cases | Empty top 10, all nulls, perfect score |
| **Negative** | Invalid inputs, missing fields | Non-existent race ID, null prediction |
| **Error handling** | DB failures, malformed data | Supabase returns error, malformed JSON body |
| **Security** | Auth guards, admin checks | 401 for unauthenticated, 403 for non-admin |

## Test Naming Convention

```typescript
describe("scoreRacePrediction", () => {
  it("should return 0 points when no positions match", () => {});
  it("should award 1 point per matching position", () => {});
  it("should award perfect podium bonus when P1-P3 are exact", () => {});
  it("should handle null predictions gracefully", () => {});
});

describe("POST /api/results/score", () => {
  it("should return 401 when user is not authenticated", () => {});
  it("should return 403 when user is not admin", () => {});
  it("should return 400 when raceId is missing", () => {});
  it("should return 200 and score predictions on success", () => {});
});
```

## Anti-Patterns

- **Never** let real Supabase calls reach a unit test.
- **Never** use `sleep()` or time-based waits in tests.
- **Never** share mutable state between tests.
- **Never** skip or comment out tests to make CI pass.
- **Never** write tautological tests that always pass.
- **Never** couple tests to implementation details (private methods, internal state).
