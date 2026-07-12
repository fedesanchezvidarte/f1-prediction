# Mobile Migration — Decision Log

Running record of decisions made after the initial plan. Newest first.

## 2026-07-11 — Sprint/champion tabs + results comparison (Phase 3, final iteration)

**Decision:** The mobile Predictions screen hosts a **Race / Sprint / Champion segmented
control** (`PredictionTabs`) instead of the web's fused round-selector-with-championship-option —
three same-sized segments are more thumb-friendly than the web's chip + pill arrangement, and the
round selector row simply hides on the Champion tab. The Sprint segment is disabled ("N/A") on
non-sprint rounds and switching to a round without a sprint falls back to the Race tab, mirroring
the web. The WCC pick uses a **team bottom sheet** (`TeamPickerModal`) consistent with the driver
picker rather than the web's inline dropdown.

**Results comparison:** slot highlights (green exact / amber close ±1), per-field `+N` points,
and bonus badges reuse the shared `computeRaceMatchStatuses`/`computeSprintMatchStatuses`
(newly extracted into `packages/shared/lib/prediction-status.ts`) and the existing
`computeRaceFieldPoints`/`computeSprintFieldPoints`; the official result renders in a
collapsible `ResultsPanel` behind the same Show/Hide Results toggle as the web.

**Shared extraction:** the race-prediction page's inline assembly moved into shared service
functions — `fetchUserSprintPredictions` (predictions.ts), `fetchChampionPredictionData`
(champion-predictions.ts), `fetchRaceResults`/`fetchSprintResults` (results.ts) — all accepting
an optional season-scoped **`PredictionContext`** (`createPredictionContext`) so the web Server
Component builds the driver/race id mappings once per request while mobile's per-tab TanStack
queries call the fetchers standalone. `fetchUserRacePredictions` kept its signature (context is
an optional 4th arg) and the web page now consumes all of them; behavior is unchanged and covered
by unit tests (100% lines on the new modules).

**Champion semantics on mobile:** same phase machine as web (`getChampionPredictionPhase`):
full → info banner, half → half-points banner + amber confirm modal listing the changed fields
(tracked against the last saved state, like the web's refs), closed → red banner + locked actions.
Champion submits/reset go through the same `/api/predictions/submit` payloads; champion reset is
not offered (web hides it too).

## 2026-07-11 — Leaderboard + Standings screens with a bottom tab navigator (Phase 3)

**Decision:** `apps/mobile/src/app/(app)/_layout.tsx` switched from a Stack to an Expo Router
**bottom tab navigator** (Home / Predictions / Leaderboard / Standings, F1 dark theme with
Crimson active tint). Screen titles now live in the tab config, so the race-prediction
`ScreenShell` no longer sets them inline. Both new screens are **direct-Supabase reads**
via TanStack Query (locked decision #3) with pull-to-refresh.

**Shared extraction:** the leaderboard assembly inlined in `apps/web/app/leaderboard/page.tsx`
moved to `packages/shared/lib/leaderboard.ts` — pure helpers `buildRacePointsMap`,
`buildLeaderboardEntries`, `rankLeaderboardEntries` plus the service function
`fetchDetailedLeaderboard(supabase, races)` (caller passes the already-fetched `Race[]` so
races aren't fetched twice). The web page now consumes it; behavior is unchanged and covered
by unit tests. Standings reuse `fetchChampionshipStandings` as-is.

**Mobile leaderboard scope:** simple ranked list only (rank badge, player, points, "you"
highlight) with an all-races/per-race bottom-sheet filter — the web's detailed per-race table
was deliberately skipped as phone-hostile; revisit if players ask for it.

**Also fixed in passing:** `packages/shared/lib/driver-stats.ts` still typed its client via the
web-only `@/lib/supabase/server` alias (Phase 0 leftover); it now uses
`SupabaseClient` from `@supabase/supabase-js` like every other shared service module —
importing it from mobile would otherwise fail to typecheck.

## 2026-07-10 — Bearer-token auth for mobile → Next.js API (Phase 3)

**Decision:** The web API's `createClient()` (`apps/web/lib/supabase/server.ts`) now accepts
`Authorization: Bearer <supabase access token>` in addition to SSR cookies. Mobile sends its
AsyncStorage session token via `apps/mobile/src/lib/api.ts` (`apiFetch`, base URL from
`EXPO_PUBLIC_API_URL`); web keeps cookies unchanged.

**Why:** Locked decision #3 routes privileged writes through the Next.js API, but those routes
authenticated only via `@supabase/ssr` cookies — a mobile app has no cookie jar, so every
mobile submit would 401. Bearer support is a small backwards-compatible change that keeps all
validation/driver-mapping logic in one place; the alternative (direct RLS writes from mobile)
would duplicate it. On the bearer path the client forwards the JWT to PostgREST (RLS runs as
the caller) and `auth.getUser()` is wrapped to validate the token, so route handlers stay
unchanged.

**Also this iteration:** Phase 3 split — race-tab prediction screen only first (validates the
risky touch UI); sprint tab, champion tab, results-comparison display, leaderboard and
standings follow in later iterations. Shared extractions: `fetchUserRacePredictions`
(`packages/shared/lib/predictions.ts`) and `proximityStatus`/`MatchStatus`
(`packages/shared/lib/prediction-status.ts`), both now consumed by web too (component level).

## 2026-07-10 — Sign in with Apple deferred out of Phase 2

**Decision:** Phase 2 shipped email/password + Google OAuth only (PR #84). Sign in with Apple
waits until the paid Apple Developer account is purchased (tail of Phase 2 per the plan's
cost-free path, at latest before Phase 5 submission — Apple Guideline 4.8 makes it mandatory
once Google login ships on iOS).

## 2026-07-08 — Expo SDK 54, not 57 (Phase 1)

**Decision:** `apps/mobile` targets **Expo SDK 54** (RN 0.81, React 19.1) instead of SDK 57.

**Why:** The App Store build of Expo Go supports one SDK version at a time — currently 54
during the SDK 57 transition ([Expo docs](https://docs.expo.dev/get-started/create-a-project/)).
The plan's free-testing ladder (Phases 1, 3, 4 in Expo Go on a physical iPhone) is only
possible on SDK 54; SDK 57 would force paid EAS dev builds from day one.

**Consequences / gotchas hit while switching:**
- `@expo/vector-icons` must stay on `~15.0.3` — the `^` range pulls 15.1.x (SDK 57 track),
  which drags `expo-font@57` → a second `react-native@0.86` into the tree. Symptoms of the
  dupe: NativeWind `className` type errors (augmentation lands on the wrong RN copy) and
  `hermesc` failing on private class fields (`this.#x`) that SDK 54's Hermes can't parse.
- `babel-preset-expo` is an explicit devDependency pinned `~54.0.11` (required for the
  custom `babel.config.js`; the floating version resolves to 57.x which skips lowering
  private class fields).
- Revisit after Expo Go moves to SDK 57 (or when Phase 2's native auth modules force EAS
  dev builds anyway): bump `expo` + run `npx expo install --fix`, unpin vector-icons.

## 2026-07-08 — Pin eslint-plugin-react-hooks to 7.0.1 (web)

**Decision:** `apps/web` pins `eslint-config-next@16.1.6` (exact) + `eslint-plugin-react-hooks@7.0.1`.

**Why:** Regenerating the lockfile floated the hooks plugin to 7.1.x, whose new rules
(`react-hooks/refs`, `react-hooks/set-state-in-effect`) flag ~10 pre-existing issues in
`RacePredictionContent.tsx`. Pinning restores lint-gate parity; upgrading + fixing the
findings is a separate task, out of scope for the mobile scaffold branch.
