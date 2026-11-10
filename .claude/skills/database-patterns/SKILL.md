---
name: database-patterns
description: "Database conventions for F1 Prediction: schema naming, RLS model, migrations workflow against the local Supabase stack, JSONB position arrays, and keeping shared types in sync. Use when designing tables, writing migrations or RLS policies, or changing anything under supabase/."
---

# Database Patterns Skill

Project-specific conventions. For generic Supabase and Postgres guidance, also load the `supabase` and `supabase-postgres-best-practices` skills.

## Environment Isolation

- **All database work happens against the local Supabase stack** (`supabase start`, Docker). The dev environment holds no production credentials.
- **Never** run `supabase link`, `supabase db push`, `supabase db reset --linked`, or any command with a production `--db-url`. Applying a merged migration to production is a manual step the maintainer does.
- The remote Supabase MCP is docs-only. Use the local stack (local MCP, `psql`, or Studio at `http://127.0.0.1:54323`) to inspect or change the local database.

## Migrations

- Create every migration with `supabase migration new <descriptive_name>` — never invent a filename.
- **Migrations are immutable once merged.** A schema change is always a new migration; never edit an existing one.
- Idempotent: `IF NOT EXISTS` / `IF EXISTS`, `DO $$ ... $$` guards.
- Validate locally with `supabase db reset` (replays all migrations + seed) before opening the PR. CI does the same.
- After any schema change, update `packages/shared/types/index.ts`.

## Naming

- Tables: `snake_case`, plural (`race_predictions`, `user_achievements`).
- Columns: `snake_case`; foreign keys `{referenced_table_singular}_id` (`race_id`, `user_id`).
- Timestamps: `created_at`, `updated_at` with `DEFAULT now()`.

## RLS Model

- RLS enabled on every table in `public`.
- Users read/write only their own predictions.
- Admin-only writes check `app_metadata->>'role' = 'admin'` — never `user_metadata` (user-editable).
- Leaderboard, achievements, races, drivers and teams are publicly readable.
- New or changed policies need RLS tests against the local stack.

## Data Conventions

- JSONB arrays for ordered position data (`top_10`, `top_8`, `dnf_driver_ids`).
- Per-race lineup deviations go in `race_lineup_overrides`, never by editing `drivers.team_id` / `drivers.is_active` (season-wide). See `docs/f1/race-lineup-overrides.md`.
- Results are entered manually by an admin; `meeting_key` / `source` columns stay as a hook for a future provider.

## Key Tables

| Table | Purpose |
|---|---|
| `seasons` | Season metadata, `is_current` flag |
| `races` | Race schedule per season |
| `drivers`, `teams` | Roster per season |
| `race_lineup_overrides` | Per-race lineup deviations |
| `race_results`, `sprint_results` | Official results (JSONB position arrays) |
| `race_predictions`, `sprint_predictions` | User predictions |
| `champion_predictions`, `champion_results` | Championship predictions and results |
| `season_award_types`, `season_award_results`, `season_award_predictions` | Season awards |
| `leaderboard` | Cached aggregated points and ranks |
| `achievements`, `user_achievements` | Achievement catalog and earned achievements |
| `profiles` | Display name, avatar, country |
