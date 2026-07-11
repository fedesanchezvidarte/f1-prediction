# Mobile Migration Plan — F1 Prediction (iOS + Android)

> **Status:** In progress. Plan produced in a grilling/design session on 2026-07-05.
> Post-plan decisions live in `decisions.md` (same folder).
>
> | Phase | Status |
> |---|---|
> | 0 — Monorepo restructure | ✅ Done (PR #81, 2026-07-08) |
> | 1 — Mobile scaffold | ✅ Done (PR #82, 2026-07-08 — Expo SDK 54) |
> | 2 — Auth | ✅ Done (PR #84, 2026-07-10 — email/password + Google; **Apple sign-in deferred**, see decisions.md) |
> | 3 — Core loop | 🔄 Race prediction screen done (PR #85, 2026-07-11 — incl. Bearer-token API auth). Leaderboard + standings screens done (2026-07-11 — incl. bottom tab navigator + shared `fetchDetailedLeaderboard` extraction). **Next:** sprint/champion tabs + results-comparison display |
> | 4 — Full dashboard parity | ⬜ Not started |
> | 5 — Ship (EAS Submit) | ⬜ Not started |
> **Stack:** React Native + Expo (developer is on Windows, learning RN/Expo via a course
> that covers Expo Router, NativeWind, TanStack Query, EAS Build + Publish).
> **Guiding principle:** The web app has run in production for a year without issues.
> Replicate that proven experience on mobile *first*, then add mobile-native benefits.

---

## 1. Architecture decisions (locked)

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Web vs mobile future | **Keep both worlds.** Next.js API stays as the shared backend | Web app works; standing up a second backend would duplicate 13 tested routes. Service-role secrets must stay server-side. |
| 2 | Repo topology | **Monorepo**, npm workspaces: `apps/web`, `apps/mobile`, `packages/shared` | Scoring correctness is central — shared code must be physically un-duplicatable. Metro monorepo config is simpler than the scoring engine. |
| 3 | Data access from device | **Direct-Supabase reads** (RLS-protected); **Next.js API for privileged writes** | Reads are faster + idiomatic Expo; privileged ops (service-role) can never ship in a mobile bundle. |
| 4 | Auth | **Full parity**: email/password + Google OAuth + **Sign in with Apple** | Apple App Store Guideline 4.8 requires an Apple login equivalent if any third-party social login (Google) is offered. |
| 5 | Navigation | **Expo Router** (file-based) | Mirrors the Next.js `app/` folder model the developer already knows; built-in deep linking serves the OAuth redirect. Also taught in the course. |
| 6 | Styling | **NativeWind** (Tailwind for RN) | Reuses the entire Tailwind mental model + F1 palette as a shared `tailwind.config`. Taught in the course. |
| 7 | Scope | **Player-only app.** Admin panel stays **web-only, permanently** | Sole admin enters results at a desk; a 10-position finishing-order form is miserable on a phone. Web app stays alive to serve it. |
| 8 | Client data fetching | **TanStack Query** wrapping the shared read functions | Caching, loading/error states, background refetch, pull-to-refresh — idiomatic mobile UX, nearly free. Taught in the course. |
| 9 | Push notifications | **Deferred to v2** | The headline "why mobile," but needs a working app + server-side scheduler + device-token plumbing. Doesn't help validate the core loop. Build after parity. |
| 10 | Build & distribution | **EAS Build + EAS Submit** | Windows cannot build iOS locally (needs macOS/Xcode). EAS compiles on Expo's Mac cloud. Taught in the course. |
| 11 | Shared-code extraction | **In-place monorepo restructure on a branch, gated by quality gates** | Import refactor is mechanical and fully covered by `tsc`. All-at-once + gated is *less* risky than multiple half-monorepo intermediate states. |

**Also confirmed:** Both apps point at the **same Supabase project** (shared users, points,
leaderboards, standings — one source of truth).

---

## 2. What gets reused vs rewritten

### Reused verbatim → `packages/shared`
- `types/index.ts`
- Pure `lib/` functions: `scoring.ts`, `point-system.ts`, `achievements.ts`, `drivers.ts`,
  `teams.ts`, `race-utils.ts`, `championship-standings.ts`, `driver-stats.ts`, `admin.ts`
  (`isAdminUser` reads `app_metadata.role` — framework-agnostic)
- Service functions (take an injected `SupabaseClient`): `scoring-service.ts`,
  `achievement-calculator.ts`, `races.ts`
- `messages/en.ts` + `es.ts` — translation content + the `Messages` type

### Reused as-is (no move)
- **Supabase backend** — same project, DB schema, RLS policies, auth, users.
- The **11 Next.js API routes** in `app/api/` become the shared backend (privileged writes:
  scoring, manual result entry, admin ops, prediction submit/reset).

### Rewritten fresh in `apps/mobile`
- **All UI** — RN primitives (`<View>`, `<Pressable>`, `<Text>`), no DOM. The web *design*
  transfers; the *code* does not. Each of the 12 dashboard cards is a from-scratch rebuild.
- **Supabase client** — `@supabase/supabase-js` `createClient` with an **AsyncStorage**
  storage adapter (NOT `@supabase/ssr` `createBrowserClient`, which is web-only).
- **`LanguageProvider` shell** — same `useLanguage()` API (`t`, `language`, `setLanguage`),
  but backed by `expo-localization` + AsyncStorage instead of `navigator`/`localStorage`/
  `document`. Consuming code reads identically.
- **Client-side data fetching** — TanStack Query hooks over the shared read functions
  (web fetches in Server Components; mobile has none).

### Stays web-only, forever
- `app/` pages + all 11 API routes (Next.js)
- `components/` (React DOM + Tailwind)
- Admin panel (`components/admin/*`, `app/admin`)
- `lib/supabase/server.ts` + `lib/supabase/client.ts` (SSR/cookies)

---

## 3. Build sequence

### Phase 0 — Monorepo restructure (touches the working web app)
- Move repo into `apps/web` + extract shared code into `packages/shared`.
- Rewrite web imports (`@/lib/scoring` → `@f1/shared`, etc.) across all sites.
- **Done only when all four quality gates pass exactly as today:**
  1. `npx tsc --noEmit` — zero type errors
  2. `npm test` — all pass
  3. `npm run lint` — zero errors
  4. Translation parity (matching key counts en/es)
- **No mobile work begins until web is green.** Do this on a branch.
- Metro/workspace config: root `package.json` `"workspaces"`, `apps/mobile/metro.config.js`
  with `watchFolders` → repo root + root `node_modules` in `nodeModulesPaths`,
  `packages/shared/package.json` with `main`/`exports`. Next.js consumes the shared TS via
  `transpilePackages`.

### Phase 1 — Mobile scaffold
- `apps/mobile` Expo app (Expo Router).
- Metro monorepo config; verify shared package imports resolve.
- NativeWind + F1 palette (`tailwind.config`): Crimson `#CF2637`, Graphite `#2A2B2A`,
  Lavender `#A06CD5`, Amber `#FFB100`, Jungle Green `#44AF69`, Ocean Blue `#3C91E6`.
  (Reminder: `#FFB100` and `#A06CD5` fail WCAG AA on white — dark backgrounds only.)
- Supabase client (supabase-js + AsyncStorage).
- TanStack Query provider.
- `useLanguage()` shell (expo-localization + AsyncStorage).

### Phase 2 — Auth
- Email/password (trivial with supabase-js; session persists in AsyncStorage).
- Google OAuth — native flow via `expo-web-browser` `openAuthSessionAsync` +
  **custom URL scheme deep link** as redirect; register redirect URL in Supabase.
- Sign in with Apple — new provider; requires **paid Apple Developer account ($99/yr)**
  + native config in Supabase.
- Test on **physical iPhone** via EAS dev build (native modules can't run in Expo Go) and
  **Android emulator** (Android Studio, runs on Windows).

### Phase 3 — Core loop (highest risk first)
- **Race prediction screen** (top-10 DriverSelect ×N + qualifying top-3 + specials).
  Build first — it's the highest-risk touch UI. Validate that predicting on a phone feels
  good *before* investing days in dashboard cards.
- Leaderboard + Standings (direct-Supabase reads, low effort, high daily value).

### Phase 4 — Full dashboard parity
- All 12 dashboard cards + modals (PointSystem, RaceCalendar, Standings).
- Achievements + Profile.

### Phase 5 — Ship
- EAS Submit → App Store + Play Store.

### v2 — Native benefits
- **Push notifications** (`expo-notifications` + Expo push service): deadline reminders first
  ("qualifying starts in 2h — lock your prediction"), then results/standings pushes.
  Needs a device-token table + a server-side scheduler (Supabase scheduled Edge Function /
  `pg_cron`, or Vercel cron on the existing Next.js app) reading stored race datetimes.
- Further mobile-native polish.

---

## 4. Key gotchas / prerequisites (don't get surprised)

- **Windows cannot build iOS.** All iOS builds are cloud (EAS). iOS testing is on a
  **physical iPhone** via EAS dev build — no iOS Simulator (needs a Mac).
- **Apple 4.8:** offering Google login on iOS *requires* Sign in with Apple, or App Store
  rejection.
- **Paid Apple Developer account ($99/yr)** needed for Sign in with Apple + App Store.
- **Native modules** (Google/Apple auth, later notifications) mean you need EAS **dev builds**,
  not plain Expo Go, on physical devices.
- **Phase 0 edits the working production web app.** It's mechanical and `tsc`-verified, but
  it happens first — keep it on a branch, gated.

---

## 5. Testing ladder — what you can test for free, and when you need the $99 account

**Bottom line:** you can build and test ~80%+ of the app for free, no Apple Developer
account, no Mac. The paid account is required for only ONE feature (Sign in with Apple on a
physical iPhone) and for shipping.

### Free, no account, no Mac

**Expo Go on your physical iPhone** (install Expo Go from the App Store, `npx expo start`,
scan QR — live hot reload). Covers:
- All UI, Expo Router navigation, NativeWind styling
- Full prediction flow, leaderboard, standings, dashboard, profile, achievements
- TanStack Query + all direct-Supabase reads against the **live** Supabase project
- ✅ **Email/password login** (plain `signInWithPassword` network call — no native module)
- ✅ **Google login** (`expo-web-browser` system-browser flow + deep link — already in Expo Go)
- ❌ **Sign in with Apple** — needs a native entitlement Expo Go doesn't carry
- ❌ Push notifications on device (v2 anyway)

**Android — everything works free.** A development build (`eas build --profile development
--platform android`, or local) installs on the Android Studio emulator (runs on Windows) or a
physical Android phone. No account to *test* (Play Store's $25 one-time is publish-only). All
features testable here, including Apple-guideline-equivalent flows and later notifications.

### Why email/Google work in Expo Go but Apple doesn't
- Email/password = network call to Supabase, no native code.
- Google = web-browser OAuth + deep link, both built into Expo Go.
- Apple = calls Apple's *native* iOS auth API (`expo-apple-authentication`), needs an
  entitlement compiled into the binary → requires a dev build → on Windows that means EAS →
  which needs the paid Apple account.

### When the $99 account actually becomes required
1. Testing **Sign in with Apple on a physical iPhone** (needs an iOS dev build with the Apple
   entitlement; on Windows only EAS can produce it).
2. **TestFlight / App Store** submission (Phase 5).

### Recommended cost-free path
- **Phases 1, 3, 4** → build entirely in **Expo Go on the iPhone**, free.
- **Phase 2 auth** → test email/password + Google in Expo Go for free; test the Apple flow on
  **Android** meanwhile, OR buy the account here if you want to verify Apple sign-in on iPhone.
- **Buy the $99 account only at** the tail of Phase 2 (Apple sign-in on iPhone) or Phase 5
  (shipping) — it is NOT a prerequisite to start.
