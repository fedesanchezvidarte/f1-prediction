import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Keep-alive cron. Supabase pauses free-tier projects after ~7 days of
 * inactivity; this endpoint issues a trivial database read so the project
 * always looks active. It's triggered daily by Vercel Cron (see
 * apps/web/vercel.json) — an *external* ping is required because a paused
 * project's own pg_cron is suspended and can't self-wake.
 *
 * Least privilege on purpose: it uses the public anon key and a single
 * `select ... limit 1` against a publicly-readable table. The goal is only to
 * register activity, never to read anything meaningful.
 */

// Never cache/statically optimize — the handler must actually run each call.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // When CRON_SECRET is set, Vercel Cron sends it as `Authorization: Bearer …`.
  // Reject anything else so the route isn't a public database-poke. If the
  // secret is unset the check is skipped (still functional, just unauthenticated).
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase.from("races").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() });
}
