# Service Layer Patterns

## Full Annotated Service Function Example

Based on the existing `lib/scoring-service.ts` pattern:

```typescript
import { scoreRacePrediction, scoreSprintPrediction } from "./scoring";
import { calculateAchievementsForUsers } from "./achievement-calculator";

// Type for the Supabase client — injected, never created here
type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

// Typed result interface
export interface ScoringResult {
  racePredictionsScored: number;
  sprintPredictionsScored: number;
  achievements?: AchievementCalculationResult;
}

/**
 * Score all predictions for a given race.
 * 
 * Pattern:
 * 1. Fetch race result from DB
 * 2. Fetch submitted predictions from DB
 * 3. Score each prediction using pure function
 * 4. Update each prediction with points in DB
 * 5. Update leaderboard
 * 6. Trigger achievement calculation
 */
export async function scoreRaceForId(
  supabase: SupabaseClient,  // Always first parameter
  raceId: number
): Promise<ScoringResult> {
  // --- Step 1: Fetch result ---
  const { data: raceResult, error: resultError } = await supabase
    .from("race_results")
    .select("*")
    .eq("race_id", raceId)
    .single();

  if (resultError || !raceResult) {
    throw new Error(`No race result found for race ${raceId}`);
  }

  // --- Step 2: Fetch predictions ---
  const { data: predictions, error: predError } = await supabase
    .from("race_predictions")
    .select("*")
    .eq("race_id", raceId)
    .eq("status", "submitted");

  if (predError) {
    throw new Error(`Failed to fetch predictions for race ${raceId}`);
  }

  // --- Step 3: Score each prediction using PURE function ---
  const scoredPredictions = (predictions || []).map((pred) => {
    const breakdown = scoreRacePrediction({
      predTop10: pred.top_10,
      predPole: pred.pole_position,
      predFastestLap: pred.fastest_lap,
      predFastestPitStop: pred.fastest_pit_stop,
      predDriverOfTheDay: pred.driver_of_the_day,
      resultTop10: raceResult.top_10,
      resultPole: raceResult.pole_position,
      resultFastestLap: raceResult.fastest_lap,
      resultFastestPitStop: raceResult.fastest_pit_stop,
      resultDriverOfTheDay: raceResult.driver_of_the_day,
    });
    return { id: pred.id, userId: pred.user_id, total: breakdown.total };
  });

  // --- Step 4: Update DB with scores ---
  for (const scored of scoredPredictions) {
    const { error: updateError } = await supabase
      .from("race_predictions")
      .update({ points_earned: scored.total, status: "scored" })
      .eq("id", scored.id);

    if (updateError) {
      throw new Error(`Failed to update prediction ${scored.id}`);
    }
  }

  // --- Step 5: Update leaderboard ---
  const affectedUserIds = scoredPredictions.map((s) => s.userId);
  await updateLeaderboard(supabase, affectedUserIds);

  // --- Step 6: Non-critical achievement calculation ---
  let achievements;
  try {
    achievements = await calculateAchievementsForUsers(supabase, affectedUserIds);
  } catch {
    // Achievement errors don't fail the scoring operation
    console.error("Achievement calculation failed, continuing");
  }

  return {
    racePredictionsScored: scoredPredictions.length,
    sprintPredictionsScored: 0,
    achievements,
  };
}
```

## Key Patterns to Follow

### 1. Supabase Query Chains

```typescript
// Select with filters
const { data, error } = await supabase
  .from("table_name")
  .select("*")
  .eq("column", value)
  .single();  // Use .single() when expecting exactly one row

// Insert
const { error } = await supabase
  .from("table_name")
  .insert({ column1: value1, column2: value2 });

// Update with filter
const { error } = await supabase
  .from("table_name")
  .update({ column: newValue })
  .eq("id", rowId);

// Upsert (insert or update on conflict)
const { error } = await supabase
  .from("table_name")
  .upsert({ id: rowId, column: value }, { onConflict: "id" });

// Delete with filter
const { error } = await supabase
  .from("table_name")
  .delete()
  .eq("id", rowId);
```

### 2. Error Handling Strategy

```typescript
// Critical path: throw on error
if (error) {
  throw new Error(`Failed to ${operation} for ${context}: ${error.message}`);
}

// Non-critical path: catch and continue
try {
  await nonCriticalOperation(supabase);
} catch {
  console.error("Non-critical operation failed, continuing");
}
```

### 3. Leaderboard Update Pattern

The leaderboard is recalculated for affected users after scoring:

```typescript
async function updateLeaderboard(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<void> {
  for (const userId of userIds) {
    // 1. Aggregate total points from all scored predictions
    // 2. Count predictions submitted
    // 3. Find best race points
    // 4. Count perfect podiums
    // 5. Upsert leaderboard entry
  }
  // 6. Recalculate ranks for all entries
}
```

### 4. Achievement Reconciliation Pattern

```typescript
async function reconcileAchievements(
  supabase: SupabaseClient,
  userId: string,
  earnedIds: Set<string>,
  existingIds: Set<string>
): Promise<{ awarded: number; revoked: number }> {
  // Insert newly earned (in earnedIds but not existingIds)
  // Delete revoked (in existingIds but not earnedIds)
}
```

## Exemplar Files

- `lib/scoring-service.ts` — Full scoring service with leaderboard updates
- `lib/achievement-calculator.ts` — Achievement evaluation and reconciliation
