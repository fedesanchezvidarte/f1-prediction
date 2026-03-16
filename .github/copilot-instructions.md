# GitHub Copilot Instructions - F1 Prediction

This file provides specific instructions and context for GitHub Copilot to ensure high-quality code and design consistency throughout the F1 Prediction project.

## Project Context
- **Name:** F1 Prediction
- **Purpose:** A fun, friendly Formula 1 prediction game for friends. Strictly non-gambling.
- **Key Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase, OpenF1 API.

## Skills

Domain-specific knowledge is organized as skills in `.github/skills/`. Each skill has a `SKILL.md` core file and optional `references/` for progressive disclosure.

| Skill | Path | Trigger |
|---|---|---|
| **architecture** | `.github/skills/architecture/SKILL.md` | Planning new features, creating LikeC4 diagrams, designing database migrations |
| **lib-patterns** | `.github/skills/lib-patterns/SKILL.md` | Implementing or modifying files in `lib/` |
| **api-patterns** | `.github/skills/api-patterns/SKILL.md` | Implementing or modifying files in `app/api/` |
| **ui-ux-patterns** | `.github/skills/ui-ux-patterns/SKILL.md` | Implementing or modifying components, pages, or translations |
| **testing-patterns** | `.github/skills/testing-patterns/SKILL.md` | Writing or modifying test files under `__tests__/` |

## Coding Standards
-   **Strict TypeScript:** Ensure all components and functions are properly typed.
-   **Bilingual Support:** Use the `useLanguage` hook and reference translations in `messages/en.ts` or `messages/es.ts`.
-   **Component Structure:** Prefer functional components with Tailwind CSS for styling.
-   **Security:** Always verify Supabase sessions in Server Components or Middleware.

## Specialized Agents

Seven custom agents live in `.github/agents/` and are organized by application layer. For end-to-end feature development, use the **Feature Orchestrator** which coordinates all phases.

| Agent | File | Paired Skill | When to use |
|---|---|---|---|
| **Feature Orchestrator** | [`feature-orchestrator.agent.md`](agents/feature-orchestrator.agent.md) | *(coordinates all)* | End-to-end feature development across all layers |
| **Architect** | [`architect.agent.md`](agents/architect.agent.md) | `architecture` | System design, C4 diagrams, DB schemas, feature decomposition |
| **Libs Expert** | [`libs-expert.agent.md`](agents/libs-expert.agent.md) | `lib-patterns` | Pure functions and service-layer code in `lib/` |
| **API Expert** | [`api-expert.agent.md`](agents/api-expert.agent.md) | `api-patterns` | Route handlers in `app/api/` |
| **UI/UX Expert** | [`ui-ux-expert.agent.md`](agents/ui-ux-expert.agent.md) | `ui-ux-patterns` | Components, pages, translations, styling |
| **QA** | [`qa.agent.md`](agents/qa.agent.md) | `testing-patterns` | Unit tests, API tests, E2E tests — **primary agent for all testing work** |
| **A11y** | [`a11y.agent.md`](agents/a11y.agent.md) | *(inline)* | Accessibility audits, WCAG compliance, keyboard/SR support |

> **Feature workflow:** For new features, invoke the **Feature Orchestrator** which manages 10 development phases and delegates to the appropriate layer agents.

> **Testing workflow:** When executing tasks for creating, updating, or maintaining tests, delegate all test planning, writing, and verification to the **QA** agent.

---

## Testing Standards

The project uses **Jest + ts-jest** for unit and service-layer tests. All tests live under `__tests__/`, mirroring the `lib/` folder structure.

### Rules — apply to every code change or new feature:

1.  **New `lib/` function or utility** → add or update the corresponding `__tests__/lib/*.test.ts` file with cases covering the happy path, edge cases, and null/undefined inputs.
2.  **New API route** → add an `__tests__/api/*.test.ts` that at minimum covers: unauthenticated request (401), invalid body (400), and the success path (200/201).
3.  **Bug fix** → add a regression test that reproduces the exact failing scenario before writing the fix.
4.  **Scoring or achievement logic change** → update `__tests__/lib/scoring.test.ts` or `__tests__/lib/achievementCalculator.test.ts` to reflect the new behavior; **do not delete existing cases unless the rule itself changed**.
5.  **Service layer change** (`lib/scoring-service.ts`, `lib/achievement-calculator.ts`) → use the `__tests__/helpers/mockSupabase.ts` factory to keep DB interactions fully mocked.
6.  **Coverage target:** maintain >80% line coverage for all files in `lib/`, verified by running `npx jest --coverage`.
7.  **Never skip or comment out a test** to make CI green — fix the underlying code instead.
8.  **Pure functions first:** if a new feature can be extracted into a pure function (no I/O, no Supabase), do so and test that function in isolation before wiring it to the DB layer.
