import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AchievementsContent } from "@/components/achievements/AchievementsContent";
import type { Achievement, AchievementCategory } from "@/types";

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

  const { data: allAchievements } = await supabase
    .from("achievements")
    .select("*")
    .order("id", { ascending: true });

  const { data: userAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", user.id);

  const achievements: Achievement[] = (allAchievements ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    description: a.description,
    iconUrl: a.icon_url,
    category: a.category as AchievementCategory,
    threshold: a.threshold,
    createdAt: a.created_at,
  }));

  const earnedIds = (userAchievements ?? []).map((ua) => ua.achievement_id);

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
