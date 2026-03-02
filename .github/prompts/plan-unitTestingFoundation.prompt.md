# Plan: Unit Testing Foundation for f1-prediction

The project has zero tests and no test framework installed. The plan introduces Jest + ts-jest, configures path aliases, and delivers tests in 3 priority bulks ordered by coverage ROI: (1) pure logic functions, (2) service layer with mocked Supabase, (3) API route handlers. Bulk 1 alone covers the scoring engine, race utilities, admin checks, and static data — the most critical and easiest-to-break code — with ~60+ test cases.

---

## Phase 0 — Tooling Setup

1. Install dev dependencies: `jest`, `ts-jest`, `@types/jest`
2. Create `jest.config.ts` at root with `ts-jest` preset, `moduleNameMapper` for the `@/*` path alias pointing to `<rootDir>/*`, and `testMatch` of `**/__tests__/**/*.test.ts`
3. Add `"test": "jest"` and `"test:watch": "jest --watch"` scripts to `package.json`
4. Create a `__tests__/` folder at root mirroring the `lib/` structure

---

## Phase 1 — Pure Logic (Bulk 1, highest ROI)

These files have **zero external dependencies** and can be tested directly without mocks.

### 1a. `lib/scoring.ts` (~35 test cases)

The heart of the app. Test all 3 exported functions + the 2 internal helpers (`arraysMatchExact`, `arraysMatchAnyOrder` — tested indirectly through the public API):

**`scoreRacePrediction`:**
- Perfect prediction (all 10 positions + pole + FL + pit stop + DOTD = 42 pts)
- Zero-match prediction (all wrong = 0 pts)
- Exact podium bonus (+10) vs any-order podium bonus (+5)
- Exact top-10 bonus (+10) vs any-order top-10 bonus (+5)
- Partial position matches (e.g., 3 of 10 correct)
- Null predictions in `predTop10` slots (should not count)
- Pole, fastest lap, pit stop, DOTD each independently correct/incorrect
- DOTD when `resultDriverOfTheDay` is null (should not award)
- Edge: empty arrays, single-match arrays

**`scoreSprintPrediction`:**
- Perfect sprint (all 8 + pole + FL = 20 pts, with different bonus values: +5/+2)
- Zero-match sprint
- Podium bonuses (exact +5, any-order +2)
- Top-8 bonuses (exact +5, any-order +2)
- Partial matches

**`scoreChampionPrediction`:**
- All correct (WDC 20 + WCC 20 + DNFs 10 + Podiums 10 + Wins 10 = 70 pts)
- Half-points flag (`isHalfPoints: true` → `Math.floor(total / 2)`)
- Null result fields (e.g., `resultMostDnfs: null` → no match even if pred is set)
- Each field independently correct/incorrect
- Half-points with odd total (verify floor behavior)

### 1b. `lib/race-utils.ts` (~15 test cases)

Pure date-based logic. Use `jest.useFakeTimers()` to control `Date`.

**`getRaceStatus`:**
- Before start → `"upcoming"`
- Between start and end → `"live"`
- After end → `"completed"`
- Edge: exactly at start boundary, exactly at end boundary

**`getNextRace`:**
- All past → `undefined`
- Mix of past/future → returns first future
- All future → returns first

**`getPredictionCardRaces`:**
- No live, 5 upcoming → first 3 upcoming
- 1 live, 2 upcoming → `[live, up1, up2]`
- 0 races → `[null, null, null]`
- 1 live, 0 upcoming → `[live, null, null]`

### 1c. `lib/admin.ts` (~8 test cases)

**`isAdminUser`:**
- Null user → `false`
- User with `app_metadata.role === "admin"` → `true`
- User with ID in `ADMIN_USER_IDS` env → `true`
- User with neither → `false`
- Multiple IDs in env (comma-separated, with spaces) → correct match
- Empty `ADMIN_USER_IDS` env → `false`

### 1d. `lib/point-system.ts` (~5 test cases)

Static data integrity:
- `POINT_SYSTEM` has 3 sections (Race, Sprint, Championship)
- Each section has `maxPoints` consistent with sum of rule points (or documented bonuses)
- All rules have non-empty `category`, `description`, and `points > 0`

### 1e. `lib/achievements.ts` (~8 test cases)

Pure helpers only (skip `fetchAchievementsData` which needs Supabase):
- `getAchievementIcon`: known slug returns correct icon, unknown slug returns `Trophy` fallback
- `getCategoryColors`: valid category returns colors object, invalid returns fallback
- `ACHIEVEMENT_SORT_ORDER` contains no duplicates
- `ACHIEVEMENT_ICONS` entries match slugs in sort order

---

## Phase 2 — Service Layer with Mocked Supabase (Bulk 2)

These require a lightweight Supabase mock. Create a `__tests__/helpers/mockSupabase.ts` factory that returns a chainable mock (`from().select().eq().single()` pattern).

### 2a. `lib/scoring-service.ts` (~12 test cases)

- `scoreRaceForId`: mock DB to return results + predictions → verify correct points written back, status updated to `"scored"`, leaderboard updated
- No result found → returns `{ racePredictionsScored: 0, sprintPredictionsScored: 0 }`
- No predictions found → returns 0 scored
- Achievement calculation failure doesn't crash scoring (error is caught)
- `scoreChampionForSeason`: mock champion result + predictions → verify half-points handling, team best driver scoring, leaderboard update
- `updateLeaderboard`: verify rank calculation with tied scores

### 2b. `lib/achievement-calculator.ts` (~15 test cases)

- `calculateAchievementsForUsers`: given mock data with known scored predictions, verify correct achievement IDs are earned
- Reconciliation: new achievements are inserted, revoked ones are deleted
- Edge: user with zero predictions → no achievements
- Edge: no achievements defined in DB → early return
- `calculateAchievementsForAllUsers`: collects unique user IDs from all prediction tables

---

## Phase 3 — API Route Handlers (Bulk 3, future)

Mock `NextRequest`, `NextResponse`, and `createClient`. Each route handler is a thin wrapper around the service layer, so tests focus on:
- Auth guard (401 for unauthenticated)
- Admin guard where applicable (403)
- Input validation (400 for bad payloads)
- Correct delegation to service functions
- This phase can be deferred as Phases 1-2 cover the actual business logic.

---

## Verification

- Run `npm test` — all tests pass green
- Run `npx jest --coverage` — verify coverage % for `lib/` files (target: >80% for Phase 1 files, >60% for Phase 2 files)
- Ensure `npm run build` still works (no test config interference)

---

## Decisions

- **Jest over Vitest**: Jest is more mature for Next.js projects and `ts-jest` handles path aliases well without Vite config overhead. No strong objection to Vitest if you prefer it.
- **Phase 1 first**: Pure functions give the best coverage-to-effort ratio and catch regressions in scoring — the #1 feature users would notice if broken.
- **Supabase mock factory in Phase 2**: A reusable chainable mock avoids test duplication and mirrors the real Supabase client API shape.
- **Phase 3 deferred**: API routes are thin wrappers; if Phases 1-2 cover the logic, route tests add marginal value and can be tackled later.
