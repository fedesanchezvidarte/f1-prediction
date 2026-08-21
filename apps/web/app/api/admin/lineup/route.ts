import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@f1/shared/lib/admin";
import {
  deleteLineupOverride,
  fetchLineupRoster,
  upsertLineupOverride,
} from "@f1/shared/lib/lineup";

/**
 * Admin-only management of per-race lineup overrides.
 *
 * GET    ?raceId=<races.id>                 -> the season roster + this race's overrides
 * PUT    { raceId, driverId, isUnavailable, teamId, note }  -> upsert one override
 * DELETE { raceId, driverId }               -> remove one override
 *
 * `race_lineup_overrides` is read-only under RLS, so writes go through the
 * service-role client — after the admin check below.
 */

/** Auth + admin guard shared by every verb. Returns a response to bail out with, or the user. */
async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isAdminUser(user)) {
    return {
      response: NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 }),
    };
  }
  return { response: null };
}

function parsePositiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { response } = await requireAdmin(supabase);
  if (response) return response;

  const raceId = Number(request.nextUrl.searchParams.get("raceId"));
  if (!Number.isInteger(raceId) || raceId <= 0) {
    return NextResponse.json({ error: "raceId must be a positive integer" }, { status: 400 });
  }

  try {
    const roster = await fetchLineupRoster(supabase, raceId);
    return NextResponse.json({ raceId, roster });
  } catch (err) {
    console.error("[admin/lineup] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { response } = await requireAdmin(supabase);
  if (response) return response;

  let body: {
    raceId?: unknown;
    driverId?: unknown;
    isUnavailable?: unknown;
    teamId?: unknown;
    note?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raceId = parsePositiveInt(body.raceId);
  if (raceId === null) {
    return NextResponse.json({ error: "raceId must be a positive integer" }, { status: 400 });
  }
  const driverId = parsePositiveInt(body.driverId);
  if (driverId === null) {
    return NextResponse.json({ error: "driverId must be a positive integer" }, { status: 400 });
  }
  if (typeof body.isUnavailable !== "boolean") {
    return NextResponse.json({ error: "isUnavailable must be a boolean" }, { status: 400 });
  }
  const teamId = body.teamId == null ? null : parsePositiveInt(body.teamId);
  if (body.teamId != null && teamId === null) {
    return NextResponse.json(
      { error: "teamId must be a positive integer or null" },
      { status: 400 }
    );
  }
  if (body.note != null && typeof body.note !== "string") {
    return NextResponse.json({ error: "note must be a string or null" }, { status: 400 });
  }

  try {
    const { error, deleted } = await upsertLineupOverride(createAdminClient(), {
      raceId,
      driverId,
      isUnavailable: body.isUnavailable,
      teamId,
      note: (body.note as string | null | undefined) ?? null,
    });

    if (error) return NextResponse.json({ error }, { status: 500 });
    // `deleted` means the request described no deviation, so the row was removed.
    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error("[admin/lineup] PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { response } = await requireAdmin(supabase);
  if (response) return response;

  let body: { raceId?: unknown; driverId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raceId = parsePositiveInt(body.raceId);
  if (raceId === null) {
    return NextResponse.json({ error: "raceId must be a positive integer" }, { status: 400 });
  }
  const driverId = parsePositiveInt(body.driverId);
  if (driverId === null) {
    return NextResponse.json({ error: "driverId must be a positive integer" }, { status: 400 });
  }

  try {
    const { error } = await deleteLineupOverride(createAdminClient(), raceId, driverId);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/lineup] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
