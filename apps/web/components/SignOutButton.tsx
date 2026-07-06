"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export function SignOutButton() {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsRedirecting(true);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={handleSignOut}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white"
      >
        Sign out
      </button>
      <LoadingOverlay isLoading={isRedirecting} />
    </>
  );
}
