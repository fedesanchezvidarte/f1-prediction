import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@f1/shared/lib/admin";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProfileContent } from "@/components/profile/ProfileContent";
import { fetchProfileData } from "@f1/shared/lib/profile";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { profile, stats } = await fetchProfileData(supabase, user.id, {
    displayName:
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Driver",
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    email: user.email,
    createdAt: user.created_at,
  });

  const authProvider = user.app_metadata?.provider ?? "email";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar displayName={profile.displayName} avatarUrl={profile.avatarUrl ?? undefined} isAdmin={isAdminUser(user)} />

      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <ProfileContent
            profile={profile}
            stats={stats}
            authProvider={authProvider}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
