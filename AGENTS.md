# Agents — F1 Prediction

This document indexes all custom agents available in the F1 Prediction project. Each agent is a specialized AI assistant with domain expertise and a paired skill for progressive knowledge disclosure.

## Quick Reference

| Agent | File | Paired Skill | Model |
|---|---|---|---|
| **Feature Orchestrator** | `.github/agents/feature-orchestrator.agent.md` | *(coordinates all)* | Claude Opus 4.6 |
| **Architect** | `.github/agents/architect.agent.md` | `architecture` | Claude Sonnet 4.6 / Opus 4.6 |
| **Database Expert** | `.github/agents/database-expert.agent.md` | `supabase`, `supabase-postgres-best-practices` | Claude Sonnet 4.6 |
| **Libs Expert** | `.github/agents/libs-expert.agent.md` | `lib-patterns` | Claude Sonnet 4.6 |
| **API Expert** | `.github/agents/api-expert.agent.md` | `api-patterns` | Claude Sonnet 4.6 |
| **UI/UX Expert** | `.github/agents/ui-ux-expert.agent.md` | `ui-ux-patterns` | Claude Sonnet 4.6 / Opus 4.6 |
| **QA** | `.github/agents/qa.agent.md` | `testing-patterns` | Claude Sonnet 4.6 |
| **A11y** | `.github/agents/a11y.agent.md` | *(inline)* | Claude Sonnet 4.6 |

## When to Use Each Agent

### Feature Orchestrator
**Use for:** End-to-end feature development. Coordinates all 10 phases from requirements through documentation.

**Invoke when:** The user requests a new feature, a significant enhancement, or any change that spans multiple application layers (database + types + lib + API + UI + tests).

### Architect
**Use for:** System design, C4 architecture diagrams, database schema planning, feature decomposition.

**Invoke when:** Planning a new feature (produces Feature Brief), designing database migrations, creating LikeC4 diagrams, or analyzing system dependencies.

### Database Expert
**Use for:** Schema migrations, RLS policies, query optimization, Postgres best practices, and direct SQL execution via Supabase MCP.

**Invoke when:** Applying database migrations, auditing RLS policies, optimizing slow queries, inspecting live data, generating TypeScript types from the schema, or any task requiring direct interaction with the Supabase database.

### Libs Expert
**Use for:** Business logic in `lib/` — pure scoring functions, achievement calculators, service-layer functions.

**Invoke when:** Implementing or modifying files in `lib/`. Follows the two-tier pattern: pure functions (no I/O) and service functions (Supabase via dependency injection).

### API Expert
**Use for:** Route handlers in `app/api/` — auth guards, input validation, service delegation.

**Invoke when:** Creating or modifying API endpoints. Ensures thin handlers that delegate to `lib/` functions.

### UI/UX Expert
**Use for:** Components, pages, translations, Tailwind styling, Server/Client Component boundaries.

**Invoke when:** Building UI features, adding pages, creating components, or updating translations in both `messages/en.ts` and `messages/es.ts`.

### QA
**Use for:** Unit tests (Jest/ts-jest), API route tests, service-layer tests with mocked Supabase, Playwright E2E tests.

**Invoke when:** Writing or updating tests, verifying coverage targets (>80%), debugging test failures, or performing exploratory testing.

### A11y
**Use for:** WCAG 2.1 AA compliance audits, ARIA patterns, keyboard navigation, screen reader support.

**Invoke when:** Auditing components for accessibility, fixing contrast issues, adding proper ARIA attributes, or verifying bilingual a11y support.

## Feature Development Phases

The Feature Orchestrator manages these 10 phases:

| # | Phase | Agent | Blocking? |
|---|---|---|---|
| 1 | Requirements & Architecture | Architect | Blocks all |
| 2 | Database Schema & Types | Architect → Database Expert | Blocks 3–6 |
| 3 | Business Logic (`lib/`) | Libs Expert | Blocks 4 |
| 4 | API Routes (`app/api/`) | API Expert | ∥ with 5 |
| 5 | UI/UX Components & Pages | UI/UX Expert | ∥ with 4 |
| 6 | Translations (i18n) | UI/UX Expert | Depends on 5 |
| 7 | Unit & Integration Tests | QA | Depends on 3–4 |
| 8 | E2E Tests (Playwright) | QA | Depends on 5–6 |
| 9 | Accessibility Audit | A11y | Depends on 5–6 |
| 10 | Documentation & LikeC4 Diagrams | Architect | Depends on all |

## Skills & Documentation

Skills live under `.github/skills/` (with `SKILL.md` core files), while project documentation and LikeC4 diagrams live under `docs/` at the project root.

For LikeC4 DSL syntax, refer to the [official LikeC4 documentation](https://likec4.dev/dsl/).

```
.github/skills/
├── architecture/
│   └── SKILL.md
├── supabase/
│   └── SKILL.md
├── supabase-postgres-best-practices/
│   └── SKILL.md
├── lib-patterns/
│   ├── SKILL.md
│   └── references/
│       └── service-layer-patterns.md
├── api-patterns/
│   ├── SKILL.md
│   └── references/
│       └── route-handler-patterns.md
├── ui-ux-patterns/
│   ├── SKILL.md
│   └── references/
│       ├── component-patterns.md
│       └── translation-patterns.md
└── testing-patterns/
    ├── SKILL.md
    └── references/
        ├── mock-patterns.md
        └── api-test-patterns.md

docs/
├── architecture/
│   ├── feature-template.likec4
│   └── c4-modeling.md
├── f1/
├── pages/
├── color-palette.md
├── f1-prediction-overview.md
└── points-system.md
```
