import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RacePredictionContent } from "@/components/predictions/RacePredictionContent";
import {
  DRIVERS_2026,
  RACES_2026,
  TEAMS_2026,
  DUMMY_FULL_PREDICTIONS,
  DUMMY_SPRINT_PREDICTIONS,
  DUMMY_CHAMPION_PREDICTION,
  DUMMY_RACE_RESULTS,
  DUMMY_SPRINT_RESULTS,
} from "@/lib/dummy-data";

export default async function RacePredictionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Driver";
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <RacePredictionContent
            races={RACES_2026}
            drivers={DRIVERS_2026}
            teams={TEAMS_2026}
            predictions={DUMMY_FULL_PREDICTIONS}
            sprintPredictions={DUMMY_SPRINT_PREDICTIONS}
            championPrediction={DUMMY_CHAMPION_PREDICTION}
            raceResults={DUMMY_RACE_RESULTS}
            sprintResults={DUMMY_SPRINT_RESULTS}
            isOwner={true}
            displayName={displayName}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
