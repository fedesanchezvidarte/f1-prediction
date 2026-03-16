# C4 Modeling for F1 Prediction

## Existing System Decomposition

### System Context

```
[User] → [F1 Prediction System]
                ↓
         [Supabase] (auth + database)
                ↓
         [OpenF1 API] (external race data)
```

### Container Level

| Container | Description | Technology |
|---|---|---|
| Web Application | App Router with SSR/CSR | Next.js, TypeScript, Tailwind |
| Supabase | Auth, PostgreSQL, RLS | Supabase Cloud |
| OpenF1 API | Live race data provider | External REST API |

### Component Level (Web Application)

| Component | Files | Purpose |
|---|---|---|
| Scoring Engine | `lib/scoring.ts` | Pure scoring logic (race, sprint, champion, season awards) |
| Scoring Service | `lib/scoring-service.ts` | DB-integrated scoring (fetch results, score predictions, update leaderboard) |
| Achievement Calculator | `lib/achievement-calculator.ts` | Evaluate & reconcile achievements for users |
| Achievement Definitions | `lib/achievements.ts` | Static achievement rules and metadata |
| Race Utilities | `lib/race-utils.ts` | Race scheduling, status, date helpers |
| Point System | `lib/point-system.ts` | Point values and rules documentation |
| Admin Utilities | `lib/admin.ts` | Admin user verification |
| Driver Data | `lib/drivers.ts` | Driver roster and metadata |
| Team Data | `lib/teams.ts` | Team roster and metadata |
| API Layer | `app/api/**` | Route handlers (thin auth + validation layer) |
| UI Layer | `components/**` | Server/Client Components |
| Translation Layer | `messages/en.ts`, `messages/es.ts` | Bilingual content |

## Decision Criteria: New Container vs. Component

Add a **new container** when:
- The feature requires a separate deployment (e.g., a background worker)
- The feature uses a fundamentally different technology (e.g., Python ML model)
- The feature must scale independently

Add a **new component** when:
- The feature is a new logical module within the existing Next.js app
- It follows the existing lib/ → API → UI pattern
- It shares the same deployment and technology stack

> **Default: add a component.** Most F1 Prediction features are new prediction types, scoring rules, or UI pages — all components within the existing webapp container.

## Modeling a New Feature

### Step 1: Identify Affected Containers
Which containers does the feature touch? Most features touch:
- Web Application (new lib/, API, and UI code)
- Supabase (new tables or columns)

### Step 2: Identify New/Modified Components
Map the feature to the component level:
- Does it need a new pure function in `lib/`?
- Does it need a new service function in `lib/`?
- Does it need a new API route?
- Does it need new UI components?

### Step 3: Map Relationships
Define data flow between components:
```
UI Component → API Route → Service Function → Pure Function
                                ↓
                          Supabase (read/write)
```

### Step 4: Produce the Diagram
Use the `docs/architecture/feature-template.likec4` as a starting point and customize for the specific feature.

## Example: Adding a New Prediction Type

1. **Supabase**: New table `team_best_driver_predictions` with RLS
2. **Types**: New `TeamBestDriverPrediction` interface in `types/index.ts`
3. **Pure function**: `scoreTeamBestDriver()` in `lib/scoring.ts`
4. **Service function**: `scoreTeamBestDriverForRace()` in `lib/scoring-service.ts`
5. **API routes**: `app/api/predictions/team-best-driver/route.ts`
6. **UI**: `components/predictions/TeamBestDriverForm.tsx`
7. **Translations**: Keys in both `messages/en.ts` and `messages/es.ts`
8. **LikeC4**: Update system diagram to show new component
