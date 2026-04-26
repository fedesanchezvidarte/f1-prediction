---
name: lib-patterns
description: "Business logic patterns for F1 Prediction: pure scoring functions, achievement calculators, service layer with Supabase, and utility functions. Use when implementing or modifying files in lib/."
---

# Lib Patterns Skill

## Two-Tier Architecture

All business logic in `lib/` follows a strict two-tier pattern:

### Tier 1: Pure Functions (no I/O)

Files that contain **only** computation — no database calls, no network requests, no side effects.

| File | Purpose |
|---|---|
| `lib/scoring.ts` | Score race, sprint, champion, season award predictions |
| `lib/race-utils.ts` | Race date math, status calculation, scheduling helpers |
| `lib/point-system.ts` | Point values and rules constants |
| `lib/admin.ts` | Admin user verification (reads env var, but no async I/O) |
| `lib/achievements.ts` | Achievement definitions and metadata |
| `lib/drivers.ts` | Driver roster data |
| `lib/teams.ts` | Team roster data |

**Contract:**
- Input → Output. No side effects.
- All inputs and outputs are typed interfaces.
- No imports from `@supabase/ssr`, `next/server`, or any I/O library.
- Directly testable without mocks.

### Tier 2: Service Functions (Supabase I/O)

Files that orchestrate database operations around pure functions.

| File | Purpose |
|---|---|
| `lib/scoring-service.ts` | Fetch results, score predictions, update leaderboard |
| `lib/achievement-calculator.ts` | Evaluate and reconcile achievements in the DB |

**Contract:**
- Receives `SupabaseClient` as the **first parameter** (dependency injection).
- Never imports or calls `createClient` directly — the caller provides the client.
- Calls pure functions for computation, Supabase client for persistence.
- Returns typed result objects.

## SupabaseClient Type Pattern

```typescript
type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;
```

This ensures the service function accepts the same client type created by the server utility.

## Pure Function Patterns

### Scoring Input/Output Interfaces

```typescript
// Input: everything needed to score, no DB references
export interface RaceScoringInput {
  predTop10: (number | null)[];
  predPole: number | null;
  predFastestLap: number | null;
  predFastestPitStop: number | null;
  predDriverOfTheDay: number | null;
  resultTop10: number[];
  resultPole: number;
  resultFastestLap: number;
  resultFastestPitStop: number;
  resultDriverOfTheDay: number | null;
}

// Output: detailed breakdown, no DB references
export interface ScoringBreakdown {
  positionMatches: number;
  poleMatch: boolean;
  fastestLapMatch: boolean;
  fastestPitStopMatch: boolean;
  driverOfTheDayMatch: boolean;
  perfectPodium: boolean;
  matchPodium: boolean;
  perfectTopN: boolean;
  matchTopN: boolean;
  total: number;
}
```

### Function Signature

```typescript
// Pure: input → output, nothing else
export function scoreRacePrediction(input: RaceScoringInput): ScoringBreakdown {
  // computation only
}
```

## Service Function Patterns

### Dependency Injection

```typescript
// Service: SupabaseClient as first param
export async function scoreRaceForId(
  supabase: SupabaseClient,
  raceId: number
): Promise<ScoringResult> {
  // 1. Fetch data via supabase
  // 2. Call pure functions for computation
  // 3. Persist results via supabase
  // 4. Return typed result
}
```

### When to Load Reference Files

- **Creating a new service-layer file** → read `references/service-layer-patterns.md` for a full annotated example

## Error Handling in Services

- Throw on critical DB failures (missing results, failed updates).
- Non-critical failures (achievement calculation errors) are caught and logged — they don't fail the parent operation.
- Always include context in error messages: table name, operation, and relevant IDs.

## Adding a New lib/ Function

### Checklist

1. Decide: pure function or service function?
2. If pure: add to existing file or create new `lib/{domain}.ts`
3. If service: add to existing service file or create new `lib/{domain}-service.ts`
4. Define input/output interfaces in the same file (or `types/index.ts` if shared)
5. Implement the function
6. Export from the file
7. Add corresponding test in `__tests__/lib/{domain}.test.ts`
8. Run `npx tsc --noEmit` to verify types
9. Run `npx jest` to verify tests pass
