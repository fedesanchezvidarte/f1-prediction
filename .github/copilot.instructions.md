# GitHub Copilot Instructions - F1 Prediction

This file provides specific instructions and context for GitHub Copilot to ensure high-quality code and design consistency throughout the F1 Prediction project.

## Project Context
- **Name:** F1 Prediction
- **Purpose:** A fun, friendly Formula 1 prediction game for friends. Strictly non-gambling.
- **Key Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase, OpenF1 API.

## UI/UX Design Guidelines (ui-ux-pro-max)
Whenever you are asked to design, build, or improve UI/UX features, you should reference the specialized skill set located in [.cursor/skills/ui-ux-pro-max](.cursor/skills/ui-ux-pro-max).

### How to use the UI/UX Skill Set:
1.  **Consult the Skill Definition:** Read [.cursor/skills/ui-ux-pro-max/SKILL.md](.cursor/skills/ui-ux-pro-max/SKILL.md) to understand the available design patterns, color palettes, and UX guidelines.
2.  **Run Design Searches:** If you need to generate a design system or find specific styles/colors, use the provided Python scripts if available in your environment, or manually inspect the data files in [.cursor/skills/ui-ux-pro-max/data/](.cursor/skills/ui-ux-pro-max/data/).
    -   **Product Patterns:** Refer to [data/products.csv](.cursor/skills/ui-ux-pro-max/data/products.csv) for dashboard or landing page structures.
    -   **Color Palettes:** Refer to [data/colors.csv](.cursor/skills/ui-ux-pro-max/data/colors.csv) for F1-appropriate themes (reds, darks, high-contrast).
    -   **UX Principles:** Refer to [data/ux-guidelines.csv](.cursor/skills/ui-ux-pro-max/data/ux-guidelines.csv) for best practices on forms, feedback, and navigation.
3.  **Framework Specifcs:** For Next.js/React implementation details, check [data/stacks/nextjs.csv](.cursor/skills/ui-ux-pro-max/data/stacks/nextjs.csv) or [data/stacks/react.csv](.cursor/skills/ui-ux-pro-max/data/stacks/react.csv).

## Coding Standards
-   **Strict TypeScript:** Ensure all components and functions are properly typed.
-   **Bilingual Support:** Use the `useLanguage` hook and reference translations in `messages/en.ts` or `messages/es.ts`.
-   **Component Structure:** Prefer functional components with Tailwind CSS for styling.
-   **Security:** Always verify Supabase sessions in Server Components or Middleware.
