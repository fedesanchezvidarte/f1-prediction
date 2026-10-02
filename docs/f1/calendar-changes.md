# Calendar Changes

The live `races` table is the source of truth for the season calendar. It has
drifted from the original 24-round seed (`supabase/seed/races-2026.sql`) because
the real F1 calendar changed during the year — races were removed, and this one
was added. Each change is applied by hand with a paired apply/revert script in
`supabase/scripts/`.

Nothing in the app hardcodes a round total or a specific round (apart from
`CHAMPION_CLOSE_ROUND`, see [Related](#related)), so a calendar change is
data-only: no API, UI or translation work.

## Runbook: 2026 Round 16, Bahrain GP in Malaysia (Sepang)

F1 relocated the Bahrain Grand Prix to the Sepang International Circuit in
Malaysia (F1: "Bahrain Grand Prix in Malaysia"). The race was not in the live
calendar, so it is inserted as round 16 and the rounds after it move up by one:

| Round before | Round after | Race |
|---|---|---|
| — | **16** | **Bahrain GP in Malaysia / Sepang (meeting_key 1283)** |
| 16 | 17 | Singapore (1297) |
| 17 | 18 | United States (1298) |
| 18 | 19 | Mexico City (1299) |
| 19 | 20 | Sao Paulo (1300) |
| 20 | 21 | Las Vegas (1301) |
| 21 | 22 | Qatar (1302) |
| 22 | 23 | Abu Dhabi (1303) |

Rounds 1-15 are untouched.

| Field | Value |
|---|---|
| `race_name` | Bahrain Grand Prix |
| `official_name` | FORMULA 1 GULF AIR BAHRAIN GRAND PRIX IN MALAYSIA 2026 |
| `circuit_short_name` / `location` | Sepang |
| `country_name` / `country_code` | Malaysia / MYS |
| `has_sprint` | `FALSE` (P1, P2, P3, Qualifying, Race) |
| `date_start` (P1) | 2026-10-02 04:30 UTC (06:30 Spain CEST) |
| `date_end` (Qualifying, prediction deadline) | 2026-10-03 08:00 UTC (10:00 Spain CEST) |
| Race | 2026-10-04 07:00 UTC |

The race keeps `meeting_key` 1283 (the one the original seed used for Sakhir) and
the `Bahrain Grand Prix` name; only the circuit and country differ. No lineup
overrides.

### Apply

Run in the Supabase SQL editor:

```bash
#    supabase/scripts/calendar-2026-round16-bahrain-sepang-apply.sql
```

It shifts rounds 16-22 to 17-23 and inserts the race. The shift is done in two
steps (`+100`, then back down) because `races` has `UNIQUE (round, season_id)`,
which a plain `round = round + 1` can violate mid-statement. Everything is
resolved by season year and `meeting_key`, never by id.

Safe to re-run: if `meeting_key` 1283 already exists the script does nothing, so
the rounds are never shifted twice.

### Verify

```sql
SELECT r.round, r.meeting_key, r.race_name, r.country_code, r.has_sprint,
       r.date_start, r.date_end
  FROM races r
 WHERE r.season_id = (SELECT id FROM seasons WHERE year = 2026)
 ORDER BY r.round;
```

Expect 23 rows, rounds 1-23 with no gaps; round 16 is `meeting_key` 1283, round 17
is Singapore and round 23 is Abu Dhabi.

### Revert

```bash
#    supabase/scripts/calendar-2026-round16-bahrain-sepang-revert.sql
```

Deletes `meeting_key` 1283 and shifts rounds 17-23 back to 16-22. Also a no-op
when the race is absent.

> [!WARNING]
> The revert **cascades**. Every foreign key to `races(id)` is
> `ON DELETE CASCADE`, so deleting the race permanently deletes its
> `race_predictions`, `sprint_predictions`, `race_results`, `sprint_results` and
> `race_lineup_overrides`. Do not run it after users have predicted this weekend
> or after it has been scored.

## Known drift from the original seed

These files still describe the original 24-round calendar and were intentionally
not rewritten; the live DB differs from them:

- `supabase/seed/races-2026.sql` — 24 rounds, Bahrain at round 4 (Sakhir,
  2026-04-11 qualifying) and Saudi Arabia at round 5. In the live DB both were
  removed earlier (Miami is round 4), and Bahrain is now round 16 in Sepang.
- `docs/f1/qualifying-datetime.md` — the same 24-round table.
- `supabase/seed/first-seed.sql` and `supabase/dummy/*` — also assume 24 rounds.

## Related

- Champion-prediction lock round: `CHAMPION_CLOSE_ROUND` in
  `packages/shared/lib/race-utils.ts` is a hardcoded round number (14, "first race
  after the summer break"). It indexes into the live calendar, so any change to
  the round numbering before round 14 shifts which race locks champion
  predictions. This runbook only changes rounds 16 and later, so it does not
  affect it.
- Per-race lineup deviations: [race-lineup-overrides.md](race-lineup-overrides.md)
- Prediction deadline semantics: [qualifying-datetime.md](qualifying-datetime.md)
