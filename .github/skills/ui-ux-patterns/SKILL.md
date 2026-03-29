---
name: ui-ux-patterns
description: "UI/UX component patterns for F1 Prediction: Server/Client Component boundaries, Tailwind CSS styling, bilingual i18n with useLanguage hook, responsive design, and F1-themed color palette. Use when implementing or modifying components, pages, or translations."
---

# UI/UX Patterns Skill

## Server vs Client Component Boundaries

### Default: Server Component

Every component and page is a Server Component unless it needs:
- React hooks (`useState`, `useEffect`, `useContext`)
- Browser APIs (`window`, `document`, `localStorage`)
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Third-party client libraries

### When to Add `'use client'`

| Need | Component Type |
|---|---|
| Data fetching only | Server Component |
| Static content | Server Component |
| Redirects, cookies | Server Component |
| Form with state | Client Component |
| Interactive UI (dropdowns, modals) | Client Component |
| Translations via `useLanguage` | Client Component |
| Real-time updates | Client Component |

### Page Pattern

```
app/{route}/page.tsx     → Server Component (fetches data, checks auth)
  └─ renders ClientComponent.tsx  → Client Component (interactive UI)
```

## Translation Workflow

### The `useLanguage` Hook

```typescript
'use client';
import { useLanguage } from '@/components/providers/LanguageProvider';

export function MyComponent() {
  const { t } = useLanguage();
  return <h1>{t('domain.title')}</h1>;
}
```

### Adding New Keys

**Always update both files simultaneously:**

1. Add key to `messages/en.ts`
2. Add corresponding key to `messages/es.ts`
3. `messages/es.ts` imports the `Messages` type from `messages/en.ts` for type safety

### When to Load Reference Files

- **Creating new components** → read `references/component-patterns.md`
- **Adding translation keys** → read `references/translation-patterns.md`

## F1-Themed Color Palette

| Color | Hex | Tailwind Usage | Purpose |
|---|---|---|---|
| Crimson Red | `#CF2637` | `bg-[#CF2637]`, `text-[#CF2637]` | Primary brand, CTAs, highlights |
| Graphite Black | `#2A2B2A` | `bg-[#2A2B2A]`, `text-[#2A2B2A]` | Backgrounds, text |
| White | `#FFFFFF` | `bg-white`, `text-white` | Cards, contrast text |
| Lavender Purple | `#A06CD5` | `bg-[#A06CD5]`, `text-[#A06CD5]` | Accents, achievements |
| Amber Flame | `#FFB100` | `bg-[#FFB100]`, `text-[#FFB100]` | Warnings, points, highlights |
| Jungle Green | `#44AF69` | `bg-[#44AF69]`, `text-[#44AF69]` | Success, positive states |
| Ocean Blue | `#3C91E6` | `bg-[#3C91E6]`, `text-[#3C91E6]` | Links, info, secondary actions |

## Component Organization

```
components/
  {domain}/
    ComponentName.tsx       → Domain-specific component
  ui/
    SharedComponent.tsx     → Reusable, domain-agnostic UI
  layout/
    Navbar.tsx              → App layout components
    Footer.tsx
  providers/
    LanguageProvider.tsx     → Context providers
```

### Naming Convention

- Components: `PascalCase.tsx`
- Domain folders: `camelCase` matching the route (`predictions/`, `leaderboard/`, `admin/`)
- One component per file

## Tailwind CSS Patterns

### Conditional Classes with `cn()`

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "rounded-lg p-4",
  isActive && "bg-[#CF2637] text-white",
  !isActive && "bg-gray-100 text-gray-500"
)} />
```

### Responsive Design

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### Dark Mode Support

Use Tailwind's `dark:` prefix for dark mode variants:

```typescript
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
```

## Anti-Patterns

- **Never** hardcode English strings in JSX — always use `t('key')`.
- **Never** add `'use client'` to a component that only fetches data.
- **Never** use inline styles — Tailwind utility classes only.
- **Never** use CSS modules.
- **Never** create a component without checking if a similar one exists.
- **Never** skip adding keys to `messages/es.ts` when adding to `messages/en.ts`.
