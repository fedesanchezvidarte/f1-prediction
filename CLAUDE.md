# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server at http://localhost:3000 (proxies to apps/web)
npm run build            # Production build
npm test                 # Run Jest once
npm run test:watch       # Jest in watch mode
npm run test:coverage    # Jest with coverage report
npm run lint             # ESLint
npm run typecheck        # Type-check the web app (or: npx tsc --noEmit inside apps/web)
npm run typecheck:mobile # Type-check the mobile app
```

All root scripts proxy to the `apps/web` workspace. Run a single test file: `npm test -- --testPathPattern="scoring"`

Mobile app (run inside `apps/mobile`):

```bash
npx expo start            # Metro dev server (scan QR with Expo Go)
npm run typecheck         # Type-check the mobile app
npx expo export --platform android   # Verify the app bundles end-to-end
```

## Architecture

**npm-workspaces monorepo** (`apps/*`, `packages/*`) with a strict **layered architecture**:

```
apps/web/                       — Next.js app (web-only, includes the admin panel)
    app/                        — Pages + the 14 API routes (shared backend for the future mobile app)
    components/                 — React DOM components; fetch no data, receive props from Server Component pages
    lib/supabase/               — Supabase clients (server.ts, client.ts, admin.ts) — SSR/cookies, web-only
    lib/                        — Web glue: wrappers (drivers.ts, teams.ts, races.ts) that inject the server
                                  Supabase client into shared fetchers; achievements.ts adds the lucide-react
                                  icon map and re-exports the shared achievements module
apps/mobile/                    — Expo app (React Native, player-only; no admin panel)
    src/app/                    — Expo Router screens (file-based, mirrors Next.js app/ model)
    src/lib/supabase.ts         — supabase-js client on AsyncStorage (mobile-only)
    src/providers/              — LanguageProvider (same useLanguage() API as web, backed by
                                  expo-localization + AsyncStorage), TanStack Query provider
    tailwind.config.js          — NativeWind config with the same f1-* palette names as web
packages/shared/  (@f1/shared)  — framework-agnostic code, shared by both apps
    lib/                        — Pure functions (scoring.ts, race-utils.ts, point-system.ts, admin.ts,
                                  championship-standings.ts, driver-stats.ts, achievements.ts) and service
                                  functions (scoring-service.ts, achievement-calculator.ts, drivers.ts,
                                  teams.ts, races.ts, lineup.ts) taking an injected SupabaseClient
    types/index.ts              — all shared interfaces
    messages/                   — en.ts (source of truth + Messages type) and es.ts
```

Import shared code as `@f1/shared/lib/*`, `@f1/shared/types`, `@f1/shared/messages/*`. Nothing in `packages/shared` may import Next.js, React DOM, or `apps/web` code.

**Two-tier lib rule:** Pure functions have zero I/O. Service functions receive `SupabaseClient` as their first parameter and never call `createClient()` themselves — the caller injects it (web: the `apps/web/lib` wrappers; mobile later: an AsyncStorage-backed client).

**API route rule (thin handlers):** Auth → Validate → Delegate to `lib/` → Respond. No business logic inside route handlers.

**Component rule:** Default to Server Components. Only add `'use client'` when using hooks, event handlers, or browser APIs.

## Key Conventions

### Authentication
- Always use `supabase.auth.getUser()` — never `getSession()` — for server-side auth.
- Admin check via `isAdminUser()` from `@f1/shared/lib/admin` which reads `app_metadata.role`.

### Translations (i18n)
- Every user-visible string must use `t('key')` from `useLanguage()`.
- Keys follow `domain.action.detail` pattern (e.g. `navbar.season`, `login.email`).
- Add keys to both `packages/shared/messages/en.ts` and `es.ts` simultaneously.

### Styling
- Tailwind CSS only — no inline styles, no CSS modules.
- Compose conditional classes with template literals (there is no `cn()` helper).
- F1 color palette: Crimson Red `#CF2637`, Graphite Black `#2A2B2A`, Lavender Purple `#A06CD5`, Amber Flame `#FFB100`, Jungle Green `#44AF69`, Ocean Blue `#3C91E6`.
- `#FFB100` and `#A06CD5` fail WCAG AA on white — use on dark backgrounds only.

### Database
- **The dev environment never touches production.** All DB work runs against the local Supabase stack (Docker). No production credentials live in the repo, `.env.local`, CI, or the agent tooling; the remote Supabase MCP is docs-only. Applying a merged migration to production is a manual step the maintainer does.
- RLS enabled on every table in `public`.
- Create migrations with `supabase migration new <name>`. Migrations already on `main` are immutable — a schema change is always a new migration (enforced by a Claude Code hook).
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotent migrations.
- JSONB arrays for ordered position data (e.g. `top_10`, `top_8`).
- After any schema change, update `packages/shared/types/index.ts`.
- Per-race lineup deviations (driver benched for one race, or loaned to another
  team for one race) go in `race_lineup_overrides` — never by editing
  `drivers.team_id` or `drivers.is_active`, which are season-wide and rewrite
  history retroactively. See [docs/f1/race-lineup-overrides.md](docs/f1/race-lineup-overrides.md).

### Testing
- Pure functions: test directly, no mocks needed.
- Service functions: use `createMockSupabase()` from `apps/web/__tests__/helpers/mockSupabase.ts`.
- API routes: use `createMockRequest()` from `apps/web/__tests__/helpers/mockApiRoute.ts`; always cover 401, 400, 200 flows; admin routes also need 403.
- Coverage targets: >85% lines for `packages/shared/lib/`, >65% for `apps/web/app/api/`.
- Definition of Done per ticket (which test levels are required): see the `testing-patterns` skill.

## Quality Gates

Every change should pass:
1. `npm run typecheck` (and `npm run typecheck:mobile`) — zero type errors. This also enforces translation parity: `es.ts` is typed as `Messages = typeof en`.
2. `npm test` — all tests pass
3. `npm run lint` — zero errors

Enforced automatically:
- **Git hooks (Husky):** pre-commit runs `eslint --fix` on staged files (lint-staged); commit-msg runs commitlint (Conventional Commits); pre-push runs both typechecks and Jest. `--no-verify` exists for emergencies — CI is the real gate.
- **Claude Code hooks** (`.claude/settings.json`, scripts in `scripts/claude-hooks/`): block destructive git commands and pushes to `main`; block edits to migrations already on `main`; lint every edited file and report errors back.

## Development Workflow (spec-driven)

Built on the `mattpocock-skills` plugin. Typical path for a feature:

1. `/grill-with-docs` (or `/grill-me`) — align on the design; maintains `GLOSSARY.md` and `docs/adr/`.
   Side tools: `/prototype`, `/research`, `/to-questionnaire` (when the answers are in someone else's head).
2. `/to-spec` — publish the spec as a GitHub issue (`ready-for-agent`).
3. `/to-tickets` — vertical-slice tickets with blocking edges.
4. `/implement-spec` (or `/implement`) — one implementer per ticket, test-first with `/tdd`, then `/code-review`.
5. UI tickets: `a11y` agent review. Then `/pr`, and optionally `/retro`.

Bugs: `/diagnosing-bugs`. Incoming issues: `/triage`. Work too big for one session: `/wayfinder`.

Implementers load the project skills for the layer they touch:

| Skill | Layer |
|---|---|
| `lib-patterns` | `packages/shared/lib/` pure and service functions |
| `api-patterns` | `apps/web/app/api/` route handlers |
| `ui-ux-patterns` | Components, pages, Tailwind, translations |
| `database-patterns` | Schema, migrations, RLS (project conventions) |
| `supabase`, `supabase-postgres-best-practices` | Generic Supabase / Postgres guidance |
| `testing-patterns` | Jest, API tests, Playwright, Definition of Done |

The only project subagent is `a11y` (`.claude/agents/a11y.md`): WCAG 2.1 AA audits before a UI PR.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` at the repo root, created lazily. See `docs/agents/domain.md`.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
