import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import {
  calculateAchievementsForUsers,
  calculateAchievementsForAllUsers,
} from "@/lib/achievement-calculator";

/**
 * Calculates achievements for users.
 *
 * Body options:
 *  - { raceId: number }       > recalculate for all users who predicted that race
 *  - { userIds: string[] }    > recalculate for specific users
 *  - { all: true }            > full recalculation for every user with predictions
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json(
      { error: "Forbidden: admin access required" },
      { status: 403 }
    );
  }

  let body: { raceId?: number; userIds?: string[]; all?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Full recalculation for all users
    if (body.all) {
      const result = await calculateAchievementsForAllUsers(supabase);
      return NextResponse.json({ success: true, ...result });
    }

    // Recalculate for all users who predicted a specific race
    if (body.raceId) {
      const [{ data: racePreds }, { data: sprintPreds }] = await Promise.all([
        supabase
          .from("race_predictions")
          .select("user_id")
          .eq("race_id", body.raceId)
          .in("status", ["submitted", "scored"]),
        supabase
          .from("sprint_predictions")
          .select("user_id")
          .eq("race_id", body.raceId)
          .in("status", ["submitted", "scored"]),
      ]);

      const userIds = new Set<string>();
      for (const p of racePreds ?? []) userIds.add(p.user_id);
      for (const p of sprintPreds ?? []) userIds.add(p.user_id);

      if (userIds.size === 0) {
        return NextResponse.json({
          success: true,
          usersProcessed: 0,
          achievementsAwarded: 0,
          achievementsRevoked: 0,
        });
      }

      const result = await calculateAchievementsForUsers(
        supabase,
        Array.from(userIds)
      );
      return NextResponse.json({ success: true, ...result });
    }

    // Recalculate for a specific list of users
    if (body.userIds && body.userIds.length > 0) {
      const result = await calculateAchievementsForUsers(
        supabase,
        body.userIds
      );
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { error: "Provide raceId, userIds, or all: true" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Achievement calculation failed: ${message}` },
      { status: 500 }
    );
  }
}
