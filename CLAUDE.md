# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start dev server at http://localhost:3000
npm run build            # Production build
npm test                 # Run Jest once
npm run test:watch       # Jest in watch mode
npm run test:coverage    # Jest with coverage report
npm run lint             # ESLint
npx tsc --noEmit         # Type-check without emitting
```

Run a single test file: `npm test -- --testPathPattern="scoring"`

## Architecture

The project follows a strict **layered architecture**:

```
Pages/API routes (app/)
    └── Business logic (lib/)
            ├── Pure functions (no I/O) — scoring.ts, race-utils.ts, point-system.ts, admin.ts, achievements.ts, drivers.ts, teams.ts
            └── Service functions (Supabase I/O) — scoring-service.ts, achievement-calculator.ts
                    └── Supabase clients (lib/supabase/) — server.ts, client.ts, admin.ts
Components (components/) fetch no data — they receive props from Server Component pages
Types (types/index.ts) — all shared interfaces
Translations (messages/) — en.ts (source of truth + Messages type) and es.ts
```

**Two-tier lib/ rule:** Pure functions have zero I/O. Service functions receive `SupabaseClient` as their first parameter and never call `createClient()` themselves — the caller injects it.

**API route rule (thin handlers):** Auth → Validate → Delegate to `lib/` → Respond. No business logic inside route handlers.

**Component rule:** Default to Server Components. Only add `'use client'` when using hooks, event handlers, or browser APIs.

## Key Conventions

### Authentication
- Always use `supabase.auth.getUser()` — never `getSession()` — for server-side auth.
- Admin check via `isAdminUser()` from `@/lib/admin` which reads `app_metadata.role`.

### Translations (i18n)
- Every user-visible string must use `t('key')` from `useLanguage()`.
- Keys follow `domain.action.detail` pattern (e.g. `navbar.season`, `login.email`).
- Add keys to both `messages/en.ts` and `messages/es.ts` simultaneously.

### Styling
- Tailwind CSS only — no inline styles, no CSS modules.
- Use `cn()` for conditional class composition.
- F1 color palette: Crimson Red `#CF2637`, Graphite Black `#2A2B2A`, Lavender Purple `#A06CD5`, Amber Flame `#FFB100`, Jungle Green `#44AF69`, Ocean Blue `#3C91E6`.
- `#FFB100` and `#A06CD5` fail WCAG AA on white — use on dark backgrounds only.

### Database
- RLS enabled on every table in `public`.
- Migrations go in `.github/database/migrations/` with descriptive SQL filenames.
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotent migrations.
- JSONB arrays for ordered position data (e.g. `top_10`, `top_8`).
- After any schema change, update `types/index.ts`.

### Testing
- Pure functions: test directly, no mocks needed.
- Service functions: use `createMockSupabase()` from `__tests__/helpers/mockSupabase.ts`.
- API routes: use `createMockRequest()` from `__tests__/helpers/mockApiRoute.ts`; always cover 401, 400, 200 flows; admin routes also need 403.
- Coverage targets: >85% lines for `lib/`, >65% for `app/api/`.

## Quality Gates

Every change should pass:
1. `npx tsc --noEmit` — zero type errors
2. `npm test` — all tests pass
3. `npm run lint` — zero errors
4. Translation parity: matching key counts in both locale files

## Agents & Skills

Specialized subagents live in `.claude/agents/`. Invoke them via the `Agent` tool or by name:

| Agent | When to use |
|---|---|
| `feature-orchestrator` | End-to-end feature development across all layers |
| `architect` | Feature decomposition, DB schema design, LikeC4 diagrams |
| `database-expert` | Migrations, RLS policies, query optimization, Supabase MCP |
| `libs-expert` | `lib/` pure functions and service-layer functions |
| `api-expert` | `app/api/` route handlers |
| `ui-ux-expert` | Components, pages, Tailwind, translations |
| `qa` | Unit tests, API tests, Playwright E2E tests |
| `a11y` | WCAG 2.1 AA audits, ARIA, keyboard navigation |

Domain-knowledge skills live in `.claude/skills/` (Claude Code auto-discovery) and are mirrored in `.github/skills/` for GitHub Copilot. Each agent's system prompt points to the relevant `SKILL.md` under `.claude/skills/`.

| Skill | Used by |
|---|---|
| `architecture` | `architect` |
| `supabase`, `supabase-postgres-best-practices` | `database-expert` |
| `lib-patterns` | `libs-expert` |
| `api-patterns` | `api-expert` |
| `ui-ux-patterns` | `ui-ux-expert` |
| `testing-patterns` | `qa` |

### Feature Orchestrator Phases

The `feature-orchestrator` coordinates end-to-end feature work through these phases:

| # | Phase | Agent | Blocking? |
|---|---|---|---|
| 1 | Requirements & Architecture | `architect` | Blocks all |
| 2 | Database Schema & Types | `architect` → `database-expert` | Blocks 3–6 |
| 3 | Business Logic (`lib/`) | `libs-expert` | Blocks 4 |
| 4 | API Routes (`app/api/`) | `api-expert` | ∥ with 5 |
| 5 | UI/UX Components & Pages | `ui-ux-expert` | ∥ with 4 |
| 6 | Translations (i18n) | `ui-ux-expert` | Depends on 5 |
| 7 | Unit & Integration Tests | `qa` | Depends on 3–4 |
| 8 | E2E Tests (Playwright) | `qa` | Depends on 5–6 |
| 9 | Accessibility Audit | `a11y` | Depends on 5–6 |
| 10 | Documentation & LikeC4 Diagrams | `architect` | Depends on all |

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
