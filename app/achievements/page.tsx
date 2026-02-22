import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AchievementsContent } from "@/components/achievements/AchievementsContent";
import { fetchAchievementsData } from "@/lib/achievements";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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

  const { achievements, earnedIds } = await fetchAchievementsData(supabase, user.id);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar displayName={displayName} avatarUrl={avatarUrl ?? undefined} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <AchievementsContent
            achievements={achievements}
            earnedIds={earnedIds}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
