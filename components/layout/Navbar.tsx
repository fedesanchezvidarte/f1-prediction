"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  displayName: string;
  avatarUrl?: string;
}

export function Navbar({ displayName, avatarUrl }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-3">
        <Image src="/logo.svg" alt="F1 Prediction" width={36} height={36} priority />
        <div className="hidden sm:block">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-f1-white">
              F1 Prediction
            </span>
            <span className="text-xs text-muted">Season 2026</span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-3" ref={menuRef}>
        <span className="text-sm text-muted">
          {displayName}
        </span>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-sm font-medium text-f1-white transition-colors hover:bg-card-hover"
          aria-label="Open user menu"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <span className="text-xs">{initials}</span>
          )}
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-card py-1 shadow-xl">
            <button
              onClick={() => {
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
            >
              <User size={16} />
              Profile
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-f1-red transition-colors hover:bg-card-hover"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
