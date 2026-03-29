---
name: architecture
description: "Design C4 architecture diagrams, database schemas, and system decomposition for F1 Prediction features. Use when planning new features, creating LikeC4 diagrams, or designing database migrations."
---

# Architecture Skill

## C4 Abstraction Levels

The C4 model decomposes systems into four levels of detail:

| Level | What it shows | F1 Prediction example |
|---|---|---|
| **System Context** | The system as a whole + external actors | F1 Prediction ↔ Users, OpenF1 API, Supabase |
| **Container** | Deployable units inside the system | Next.js webapp, Supabase (auth + DB), OpenF1 API |
| **Component** | Logical modules within a container | Scoring engine, Achievement calculator, Prediction service |
| **Code** | Classes/functions within a component | `scoreRacePrediction()`, `calculateAchievementsForUsers()` |

## F1 Prediction System Model

### Containers

| Container | Technology | Purpose |
|---|---|---|
| `webapp` | Next.js App Router | Server/Client Components, API routes, UI |
| `supabase` | Supabase (PostgreSQL + Auth) | Database, authentication, RLS policies |
| `openf1` | OpenF1 API (external) | Live race data, results, session info |

### Container Boundaries

- **webapp → supabase**: All DB access via Supabase client (`@supabase/ssr`). Never raw SQL from the app.
- **webapp → openf1**: Server-side fetch only (API routes or Server Components). Never expose to client.
- **supabase → webapp**: Auth callbacks (`/auth/callback`), realtime subscriptions (future).

## When to Load Reference Files

- **Creating `.likec4` files** → refer to the [official LikeC4 documentation](https://likec4.dev/dsl/) for DSL syntax (specification, model, views, relationships, styling)
- **Decomposing a feature into components** → read `docs/architecture/c4-modeling.md` for modeling patterns
- **Starting a new feature diagram** → use `docs/architecture/feature-template.likec4` as skeleton

## Database Schema Conventions

### Naming
- **Tables**: `snake_case`, plural (`race_predictions`, `user_achievements`)
- **Columns**: `snake_case` (`race_id`, `user_id`, `created_at`)
- **Foreign keys**: `{referenced_table_singular}_id` (e.g., `race_id`, `user_id`)
- **Timestamps**: `created_at`, `updated_at` with `DEFAULT now()`

### Row Level Security (RLS)
- Every table must have RLS enabled
- Users can only read/write their own predictions
- Admin-only operations use `app_metadata->>'role' = 'admin'` check
- Leaderboard and achievements are publicly readable

### Migration Files
- Store in `.github/database/migrations/`
- Naming: `YYYYMMDD_description.sql`
- Include `UP` section; `DOWN` section recommended but optional
- Always wrap in a transaction (`BEGIN; ... COMMIT;`)

## TypeScript Types

- All shared types live in `types/index.ts`
- New feature types must be added alongside the schema design
- Use `interface` for object shapes, `type` for unions/aliases
- Export all types — never define inline types for cross-module use

## Feature Brief Template

When decomposing a new feature, produce a Feature Brief containing:

```
## Feature Brief: [Feature Name]

### Affected Layers
- [ ] Database (new tables/columns/migrations)
- [ ] Types (types/index.ts)
- [ ] Business logic (lib/)
- [ ] API routes (app/api/)
- [ ] UI components (components/)
- [ ] Pages (app/)
- [ ] Translations (messages/)

### Database Changes
- Table: ...
- New columns: ...
- RLS policies: ...

### New Types
- Interface: ...
- Fields: ...

### Component Graph
[Which components depend on what]

### Dependency Order
[Phase execution order based on the 10-phase workflow]

### LikeC4 Diagram
[Reference to .likec4 file]
```
