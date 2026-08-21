# Per-Race Lineup Overrides

Real F1 lineups change mid-season: a driver is stood down for one weekend, or is
loaned to the senior team for a single race. The schema originally could not
express any of that — `drivers.team_id` is one mutable column and
`drivers.is_active` is one boolean **per season**, so editing either rewrote the
whole season retroactively.

`race_lineup_overrides` records the deviation for a single race instead.

## What an override does

One row per `(race_id, driver_id)`, carrying two independent things:

| Column | Effect |
|---|---|
| `is_unavailable` | The driver is not on the grid for that race. Every prediction picker still shows them, greyed out with an "Out this race" pill, and refuses the selection. `/api/predictions/submit` rejects them with **400**. |
| `team_id` | The driver races for this team at this race only. That race's **constructor (WCC)** points are credited here instead of to `drivers.team_id`. Their badge shows this team's name and colour on that round's prediction page. |

`note` is free text shown in the admin panel.

The DB `race_lineup_overrides_not_empty` check rejects a row that does neither,
and `upsertLineupOverride` deletes rather than stores one.

### What an override deliberately does NOT change

- **Driver (WDC) points.** Always stay with the driver. A loaned driver's own
  championship total is untouched.
- **Prediction scoring.** `scoring.ts` compares raw `drivers.id` on both sides
  and never reads team data.
- **Driver stats and achievements.** Driver-id keyed, team-agnostic.
- **Season awards** (`best_driver_<teamId>`, WCC pick). Season-scoped by design —
  a one-weekend loan does not move a season-long award, and the champion pickers
  intentionally keep using the un-overridden season grid so a benched driver
  stays pickable there.

## How constructor points are attributed

`computeConstructorAggregates()` walks each result row and credits it to
`teamAtRace(driverId, raceId)` — the override's team when one exists for that
exact race, otherwise the driver's season team. Because the walk is per race
rather than per season total, only the overridden weekend moves.

Race results contribute points, wins, podiums and countback weight; sprints
contribute points only — mirroring `computeDriverAggregates()` exactly.

## Failure behaviour

The lineup fetchers **throw** when the query fails rather than returning an
empty lineup. Returning `[]` would be indistinguishable from "this race has no
overrides", which would silently un-bench a driver — and the most likely cause is
the migration simply not having been run. Each caller then chooses its own
degradation, explicitly:

| Caller | On failure |
|---|---|
| `/api/predictions/submit` | **Fails closed** — 500, refuses the write. Availability cannot be verified, so it will not assume everyone is racing. |
| Race prediction page | Degrades to the season grid and logs. The page still renders; the server guard above still blocks a bad pick. |
| Championship standings | Degrades to season-team attribution and logs. Display-only, so it does not fail the page. |

## Admin usage

Admin panel → **Lineup**. Pick a race, then per driver:

- **On the grid (season)** — toggles `drivers.is_active`. The blunt instrument:
  removes the driver from every race this season. Prefer an override for a single
  weekend.
- **Out this race** — benches them for the selected race only.
- **Races for** — the per-race team override.

Both write through admin-guarded routes using the service-role client, because
`race_lineup_overrides` and `drivers` are read-only under RLS.

## Runbook: 2026 Round 14, Dutch GP

The change this feature was built for. Lawson races for Red Bull for one weekend,
Hadjar is out, Tsunoda joins Racing Bulls.

```bash
# 1. Once per environment — creates the table.
#    supabase/migrations/migration-race-lineup-overrides.sql
# 2. The weekend's data.
#    supabase/scripts/lineup-2026-round14-dutch-apply.sql
```

Run both in the Supabase SQL editor, in that order. Both are idempotent.

To put the grid back:

```bash
#    supabase/scripts/lineup-2026-round14-dutch-revert.sql
```

Note that the revert **does not delete Yuki Tsunoda** — a `DELETE` would cascade
into any predictions and results referencing him. He stays on the grid as a
Racing Bulls driver; take him off via the admin **On the grid** toggle, or the
commented `UPDATE` at the bottom of the revert script.

Two consequences of keeping him worth knowing: Racing Bulls shows three drivers
in the team-best-driver picker for the rest of the season, and he appears in the
WDC standings on zero points for rounds 1–13. Bench him per round from the admin
panel if that matters.

To drop the table entirely, `supabase/migrations/revert-race-lineup-overrides.sql`
— but that discards every recorded deviation, not just one weekend's.

## Related

- Schema: `supabase/migrations/migration-race-lineup-overrides.sql`
- Logic: `packages/shared/lib/lineup.ts`,
  `packages/shared/lib/championship-standings.ts`
- Routes: `apps/web/app/api/admin/lineup/`, `apps/web/app/api/admin/drivers/`
- Points system: [points-system.md](../points-system.md)
