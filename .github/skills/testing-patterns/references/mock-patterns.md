# Mock Patterns

## `createMockSupabase()` — Full Usage Guide

The mock factory in `__tests__/helpers/mockSupabase.ts` provides a chainable Supabase client mock with response queues and call tracking.

## Basic Setup

```typescript
import { createMockSupabase } from "../helpers/mockSupabase";

describe("scoringService", () => {
  let supabase: any;
  let mockTable: any;
  let getUpdateCalls: any;
  let getInsertCalls: any;

  beforeEach(() => {
    const mock = createMockSupabase();
    supabase = mock.supabase;
    mockTable = mock.mockTable;
    getUpdateCalls = mock.getUpdateCalls;
    getInsertCalls = mock.getInsertCalls;
  });
});
```

## Response Queue Pattern

Each `mockTable()` call queues responses for a specific table. Responses are consumed in order; the last response is "sticky" (repeats for all subsequent calls).

```typescript
// Queue two responses for "race_results" table
mockTable("race_results",
  // First call to race_results returns this
  { data: { race_id: 1, pole_position: 1, top_10: [1, 44, 16] }, error: null },
  // Second (and all subsequent) calls return this
  { data: null, error: { message: "Not found" } }
);

// Queue responses for "race_predictions" table
mockTable("race_predictions",
  { data: [
    { id: "p1", user_id: "u1", top_10: [1, 44, 16], status: "submitted" },
    { id: "p2", user_id: "u2", top_10: [44, 1, 16], status: "submitted" },
  ], error: null }
);
```

## Chaining Pattern

The mock supports the full Supabase query chain:

```typescript
// These all work:
supabase.from("table").select("*").eq("id", 1).single();
supabase.from("table").select("*").eq("race_id", 1).in("status", ["submitted"]);
supabase.from("table").select("*").order("rank", { ascending: true });
supabase.from("table").select("*").not("column", "is", null);
supabase.from("table").update({ points: 10 }).eq("id", "p1");
supabase.from("table").insert({ user_id: "u1", points: 10 });
supabase.from("table").upsert({ id: "u1", points: 10 }, { onConflict: "id" });
supabase.from("table").delete().eq("id", "p1");
```

## Call Tracking

Track what was inserted, updated, or deleted:

```typescript
// After running the function under test...
const updates = getUpdateCalls();
expect(updates).toHaveLength(2);
expect(updates[0]).toEqual({
  table: "race_predictions",
  data: { points_earned: 15, status: "scored" },
  filters: { id: "p1" },
});

const inserts = getInsertCalls();
expect(inserts).toHaveLength(1);
expect(inserts[0]).toEqual({
  table: "leaderboard",
  data: { user_id: "u1", total_points: 15 },
});
```

## Auth Mock Integration

For service functions that don't handle auth (they receive `SupabaseClient`), the auth mock is not needed. The mock Supabase client only needs to handle `from()` chains.

For API route tests, auth is mocked separately via `jest.mock("@/lib/supabase/server")`.

## Complete Service Test Example

```typescript
import { createMockSupabase } from "../helpers/mockSupabase";
import { scoreRaceForId } from "@/lib/scoring-service";

jest.mock("@/lib/achievement-calculator", () => ({
  calculateAchievementsForUsers: jest.fn().mockResolvedValue({
    usersProcessed: 1,
    achievementsAwarded: 0,
    achievementsRevoked: 0,
  }),
}));

describe("scoreRaceForId", () => {
  it("should score predictions and update leaderboard", async () => {
    const { supabase, mockTable, getUpdateCalls } = createMockSupabase();

    // Queue race result
    mockTable("race_results", {
      data: {
        race_id: 1,
        pole_position: 1,
        race_winner: 1,
        top_10: [1, 44, 16, 55, 4, 63, 81, 11, 14, 22],
        fastest_lap: 1,
        fastest_pit_stop: 44,
        driver_of_the_day: null,
      },
      error: null,
    });

    // Queue predictions
    mockTable("race_predictions", {
      data: [
        {
          id: "pred-1",
          user_id: "user-1",
          top_10: [1, 44, 16, 55, 4, 63, 81, 11, 14, 22],
          pole_position: 1,
          fastest_lap: 1,
          fastest_pit_stop: 44,
          driver_of_the_day: null,
          status: "submitted",
        },
      ],
      error: null,
    });

    // Default response for updates/upserts
    mockTable("leaderboard", { data: null, error: null });

    const result = await scoreRaceForId(supabase as any, 1);

    expect(result.racePredictionsScored).toBe(1);

    const updates = getUpdateCalls();
    expect(updates.length).toBeGreaterThan(0);
  });
});
```

## Tips

- Always `beforeEach` to create fresh mocks — prevents state leakage between tests.
- Queue enough responses for all DB calls your function makes.
- The last queued response is sticky — useful for "default success" scenarios.
- Use `getUpdateCalls()` / `getInsertCalls()` to verify DB writes without inspecting mock internals.
