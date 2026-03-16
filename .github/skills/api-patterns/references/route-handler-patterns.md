# Route Handler Patterns

## Standard POST Handler (Authenticated User)

```typescript
// app/api/predictions/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // 1. Auth guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body (with malformed JSON protection)
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Validate input
  const { raceId, top10, polePosition, fastestLap, fastestPitStop } = body;
  if (!raceId || typeof raceId !== "number") {
    return NextResponse.json(
      { error: "raceId is required and must be a number" },
      { status: 400 }
    );
  }
  if (!Array.isArray(top10) || top10.length !== 10) {
    return NextResponse.json(
      { error: "top10 must be an array of 10 driver numbers" },
      { status: 400 }
    );
  }

  // 4. Delegate to lib/ function
  try {
    const { error } = await supabase
      .from("race_predictions")
      .upsert({
        user_id: user.id,
        race_id: raceId,
        top_10: top10,
        pole_position: polePosition,
        fastest_lap: fastestLap,
        fastest_pit_stop: fastestPitStop,
        status: "submitted",
      }, { onConflict: "user_id,race_id" });

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to submit prediction:", error);
    return NextResponse.json(
      { error: "Failed to submit prediction" },
      { status: 500 }
    );
  }
}
```

## Admin-Only POST Handler

```typescript
// app/api/results/manual/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";

export async function POST(request: NextRequest) {
  // 1. Auth guard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Admin guard
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 4. Validate
  const { raceId, polePosition, raceWinner, top10, fastestLap, fastestPitStop } = body;
  if (!raceId) {
    return NextResponse.json({ error: "raceId is required" }, { status: 400 });
  }

  // 5. Delegate to service
  try {
    const { error } = await supabase
      .from("race_results")
      .upsert({
        race_id: raceId,
        pole_position: polePosition,
        race_winner: raceWinner,
        top_10: top10,
        fastest_lap: fastestLap,
        fastest_pit_stop: fastestPitStop,
      }, { onConflict: "race_id" });

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to save result:", error);
    return NextResponse.json(
      { error: "Failed to save result" },
      { status: 500 }
    );
  }
}
```

## GET Handler (Public or Authenticated)

```typescript
// app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("rank", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
```

## Handler with Service Function Delegation

```typescript
// app/api/results/score/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { scoreRaceForId } from "@/lib/scoring-service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { raceId } = body;
  if (!raceId || typeof raceId !== "number") {
    return NextResponse.json(
      { error: "raceId is required and must be a number" },
      { status: 400 }
    );
  }

  try {
    // Delegate entirely to service function
    const result = await scoreRaceForId(supabase, raceId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Scoring failed:", error);
    return NextResponse.json(
      { error: "Failed to score predictions" },
      { status: 500 }
    );
  }
}
```

## Existing Exemplar Routes

| Route | Pattern | File |
|---|---|---|
| Submit prediction | Auth + validate + upsert | `app/api/predictions/submit/route.ts` |
| Manual result | Admin + validate + upsert | `app/api/results/manual/route.ts` |
| Score race | Admin + validate + service delegation | `app/api/results/score/route.ts` |
| Fetch OpenF1 | Admin + external API fetch | `app/api/results/fetch-openf1/route.ts` |
| Calculate achievements | Admin + service delegation | `app/api/achievements/calculate/route.ts` |
