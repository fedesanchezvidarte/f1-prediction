import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@f1/shared/lib/admin";
import { setDriverActive } from "@f1/shared/lib/drivers";

/**
 * Admin-only season-wide driver availability toggle.
 *
 * PATCH { driverId, isActive }
 *
 * This is the blunt instrument: an inactive driver leaves every picker for the
 * whole season. For a single weekend use PUT /api/admin/lineup instead.
 * `drivers` has no write RLS policy, so the update runs on the service-role
 * client after the admin check.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
  }

  let body: { driverId?: unknown; isActive?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { driverId, isActive } = body;
  if (typeof driverId !== "number" || !Number.isInteger(driverId) || driverId <= 0) {
    return NextResponse.json({ error: "driverId must be a positive integer" }, { status: 400 });
  }
  if (typeof isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  try {
    const { error } = await setDriverActive(createAdminClient(), driverId, isActive);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true, driverId, isActive });
  } catch (err) {
    console.error("[admin/drivers] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
