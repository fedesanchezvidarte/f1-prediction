# GitHub Copilot Instructions - F1 Prediction

This file provides specific instructions and context for GitHub Copilot to ensure high-quality code and design consistency throughout the F1 Prediction project.

## Project Context
- **Name:** F1 Prediction
- **Purpose:** A fun, friendly Formula 1 prediction game for friends. Strictly non-gambling.
- **Key Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase, OpenF1 API.

## UI/UX Design Guidelines (ui-ux-pro-max)
Whenever you are asked to design, build, or improve UI/UX features, you should reference the specialized skill set located in .cursor/skills/ui-ux-pro-max.

### How to use the UI/UX Skill Set:
1.  **Consult the Skill Definition:** Read .cursor/skills/ui-ux-pro-max/SKILL.md to understand the available design patterns, color palettes, and UX guidelines.
2.  **Run Design Searches:** If you need to generate a design system or find specific styles/colors, use the provided Python scripts if available in your environment, or manually inspect the data files in .cursor/skills/ui-ux-pro-max/data/.
    -   **Product Patterns:** Refer to .cursor/skills/ui-ux-pro-max/data/products.csv for dashboard or landing page structures.
    -   **Color Palettes:** Refer to .cursor/skills/ui-ux-pro-max/data/colors.csv for F1-appropriate themes (reds, darks, high-contrast).
    -   **UX Principles:** Refer to .cursor/skills/ui-ux-pro-max/data/ux-guidelines.csv for best practices on forms, feedback, and navigation.
3.  **Framework Specifcs:** For Next.js/React implementation details, check .cursor/skills/ui-ux-pro-max/data/stacks/nextjs.csv or .cursor/skills/ui-ux-pro-max/data/stacks/react.csv.

## Coding Standards
-   **Strict TypeScript:** Ensure all components and functions are properly typed.
-   **Bilingual Support:** Use the `useLanguage` hook and reference translations in `messages/en.ts` or `messages/es.ts`.
-   **Component Structure:** Prefer functional components with Tailwind CSS for styling.
-   **Security:** Always verify Supabase sessions in Server Components or Middleware.

## Testing Standards

The project uses **Jest + ts-jest** for unit and service-layer tests. All tests live under `__tests__/`, mirroring the `lib/` folder structure. Refer to [`.github/prompts/plan-unitTestingFoundation.prompt.md`](prompts/plan-unitTestingFoundation.prompt.md) for the full testing strategy.

### Rules — apply to every code change or new feature:

1.  **New `lib/` function or utility** → add or update the corresponding `__tests__/lib/*.test.ts` file with cases covering the happy path, edge cases, and null/undefined inputs.
2.  **New API route** → add an `__tests__/api/*.test.ts` that at minimum covers: unauthenticated request (401), invalid body (400), and the success path (200/201).
3.  **Bug fix** → add a regression test that reproduces the exact failing scenario before writing the fix.
4.  **Scoring or achievement logic change** → update `__tests__/lib/scoring.test.ts` or `__tests__/lib/achievementCalculator.test.ts` to reflect the new behavior; **do not delete existing cases unless the rule itself changed**.
5.  **Service layer change** (`lib/scoring-service.ts`, `lib/achievement-calculator.ts`) → use the `__tests__/helpers/mockSupabase.ts` factory to keep DB interactions fully mocked.
6.  **Coverage target:** maintain >80% line coverage for all files in `lib/`, verified by running `npx jest --coverage`.
7.  **Never skip or comment out a test** to make CI green — fix the underlying code instead.
8.  **Pure functions first:** if a new feature can be extracted into a pure function (no I/O, no Supabase), do so and test that function in isolation before wiring it to the DB layer.
