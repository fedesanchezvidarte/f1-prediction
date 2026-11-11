---
name: lib-patterns
description: "Business logic patterns for F1 Prediction: pure scoring functions, achievement calculators, service layer with Supabase, and utility functions. Use when implementing or modifying files in lib/."
---

# Lib Patterns Skill

## Two-Tier Architecture

All business logic lives in `packages/shared/lib/` (imported as `@f1/shared/lib/*`) and follows a strict two-tier pattern. Nothing in `packages/shared` may import Next.js, React DOM, or `apps/web` code. `apps/web/lib/` only holds thin wrappers that inject the server Supabase client into shared fetchers.

### Tier 1: Pure Functions (no I/O)

Files that contain **only** computation — no database calls, no network requests, no side effects. Examples: `scoring.ts`, `race-utils.ts`, `point-system.ts`, `admin.ts`, `championship-standings.ts`, `driver-stats.ts`, `prediction-status.ts`.

**Contract:**
- Input → Output. No side effects.
- All inputs and outputs are typed interfaces. No `any`, no implicit `unknown`.
- No imports from `@supabase/*`, `next/*`, or any I/O library.
- Directly testable without mocks.
- **Pure first:** if a piece of a service function can be expressed without I/O, extract it into a pure helper.

### Tier 2: Service Functions (Supabase I/O)

Files that orchestrate database operations around pure functions. Examples: `scoring-service.ts`, `achievement-calculator.ts`, `predictions.ts`, `results.ts`, `lineup.ts`, `leaderboard.ts`.

**Contract:**
- Receives `SupabaseClient` as the **first parameter** (dependency injection).
- Never imports or calls `createClient` directly — the caller provides the client.
- Calls pure functions for computation, Supabase client for persistence.
- Returns typed result objects.
- Single responsibility: compose focused functions instead of one broad service function.

## SupabaseClient Type Pattern

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
```

The framework-agnostic type, so the same function works with the web SSR client and the mobile AsyncStorage client.

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
2. If pure: add to existing file or create new `packages/shared/lib/{domain}.ts`
3. If service: add to existing service file or create new `packages/shared/lib/{domain}-service.ts`
4. Define input/output interfaces in the same file (or `packages/shared/types/index.ts` if shared)
5. Implement the function (test-first via `/tdd`)
6. Export from the file
7. Add corresponding test in `apps/web/__tests__/lib/{domain}.test.ts`
8. Run `npm run typecheck` and `npm test`

## Anti-Patterns

- Importing `createClient` in a service function — the caller provides the client.
- I/O (fetch, DB calls) in a pure function file.
- `any` for function inputs or outputs.
- Business logic in API route handlers — it belongs here.
