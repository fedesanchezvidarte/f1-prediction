import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { F1Logo } from "@/components/F1Logo";
import { SignOutButton } from "@/components/SignOutButton";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Driver";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <F1Logo />
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted">
            Welcome,{" "}
            <span className="font-medium text-f1-white">{displayName}</span>
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-f1-red/10">
            <svg
              className="h-10 w-10 text-f1-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-f1-white">
            F1 Prediction 2026
          </h2>
          <p className="mt-2 text-muted">
            The season is loading. Predictions coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
