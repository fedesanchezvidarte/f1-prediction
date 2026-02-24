import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check admin access
  if (!isAdminUser(user)) {
    redirect("/");
  }

  const fallbackName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Driver";
  const fallbackAvatar = user.user_metadata?.avatar_url;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName = profileRow?.display_name ?? fallbackName;
  const avatarUrl = profileRow?.avatar_url ?? fallbackAvatar;

  // Get current season
  const { data: season } = await supabase
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();

  if (!season) {
    return <p>No active season found.</p>;
  }

  // Get all races for the current season
  const { data: races } = await supabase
    .from("races")
    .select("id, meeting_key, race_name, circuit_short_name, round, has_sprint, date_start, date_end")
    .eq("season_id", season.id)
    .order("round", { ascending: true });

  // Get all race results
  const { data: raceResults } = await supabase
    .from("race_results")
    .select("race_id, pole_position_driver_id, top_10, fastest_lap_driver_id, fastest_pit_stop_driver_id");

  // Get all sprint results
  const { data: sprintResults } = await supabase
    .from("sprint_results")
    .select("race_id, sprint_pole_driver_id, top_8, fastest_lap_driver_id");

  // Get all drivers for this season
  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, first_name, last_name, name_acronym, driver_number, team_id")
    .eq("season_id", season.id)
    .order("last_name", { ascending: true });

  // Get teams for this season
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, color")
    .eq("season_id", season.id);

  // Get prediction counts per race
  const { data: racePredCounts } = await supabase
    .from("race_predictions")
    .select("race_id, status");

  const { data: sprintPredCounts } = await supabase
    .from("sprint_predictions")
    .select("race_id, status");

  // Build result maps
  const raceResultMap: Record<number, typeof raceResults extends (infer T)[] | null ? T : never> = {};
  for (const r of raceResults ?? []) {
    raceResultMap[r.race_id] = r;
  }

  const sprintResultMap: Record<number, typeof sprintResults extends (infer T)[] | null ? T : never> = {};
  for (const r of sprintResults ?? []) {
    sprintResultMap[r.race_id] = r;
  }

  // Build prediction stats per race
  const raceStats: Record<number, { submitted: number; scored: number }> = {};
  for (const p of racePredCounts ?? []) {
    if (!raceStats[p.race_id]) raceStats[p.race_id] = { submitted: 0, scored: 0 };
    if (p.status === "submitted") raceStats[p.race_id].submitted++;
    if (p.status === "scored") raceStats[p.race_id].scored++;
  }

  const sprintStats: Record<number, { submitted: number; scored: number }> = {};
  for (const p of sprintPredCounts ?? []) {
    if (!sprintStats[p.race_id]) sprintStats[p.race_id] = { submitted: 0, scored: 0 };
    if (p.status === "submitted") sprintStats[p.race_id].submitted++;
    if (p.status === "scored") sprintStats[p.race_id].scored++;
  }

  // Build team map
  const teamMap: Record<number, { name: string; color: string }> = {};
  for (const t of teams ?? []) {
    teamMap[t.id] = { name: t.name, color: t.color };
  }

  // Enrich drivers with team info
  const enrichedDrivers = (drivers ?? []).map((d) => ({
    ...d,
    teamName: teamMap[d.team_id]?.name ?? "Unknown",
    teamColor: teamMap[d.team_id]?.color ?? "666666",
  }));

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <Navbar displayName={displayName} avatarUrl={avatarUrl} isAdmin={true} />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <AdminPanel
          races={(races ?? []).map((r) => ({
            id: r.id,
            meetingKey: r.meeting_key,
            raceName: r.race_name,
            circuitShortName: r.circuit_short_name,
            round: r.round,
            hasSprint: r.has_sprint,
            dateStart: r.date_start,
            dateEnd: r.date_end,
            hasRaceResult: !!raceResultMap[r.id],
            hasSprintResult: r.has_sprint ? !!sprintResultMap[r.id] : false,
            raceResult: raceResultMap[r.id] ?? null,
            sprintResult: sprintResultMap[r.id] ?? null,
            racePredictions: raceStats[r.id] ?? { submitted: 0, scored: 0 },
            sprintPredictions: sprintStats[r.id] ?? { submitted: 0, scored: 0 },
          }))}
          drivers={enrichedDrivers}
        />
      </main>
      <Footer />
    </div>
  );
}
