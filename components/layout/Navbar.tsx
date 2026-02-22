"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  LogOut,
  LayoutDashboard,
  Trophy,
  Medal,
  Globe,
  Moon,
  Sun,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  displayName: string;
  avatarUrl?: string;
}

export function Navbar({ displayName, avatarUrl }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

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
    setIsSigningOut(true);
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

  const navLinks = [
    { href: "/", label: "Dashboard", icon: <LayoutDashboard size={16} />, highlight: false },
    { href: "/race-prediction", label: "Predictions", icon: <Trophy size={16} />, highlight: true },
    { href: "/leaderboard", label: "Leaderboard", icon: <Medal size={16} />, highlight: false },
  ];

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/logo.svg" alt="F1 Prediction" width={36} height={36} priority />
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-f1-white">
            F1 Prediction
          </span>
          <span className="text-xs text-muted">Season 2026</span>
        </div>
      </Link>

      <div className="relative flex items-center gap-3" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="group flex items-center rounded-full p-0.5 transition-all ring-1 ring-transparent hover:ring-border-hover"
          aria-label="Open user menu"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card text-sm font-medium text-f1-white">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-semibold">{initials}</span>
            )}
          </div>
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            {/* User info header */}
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-[11px] font-semibold text-f1-white truncate">{displayName}</p>
              <p className="text-[10px] text-muted/60 mt-0.5">Season 2026</p>
            </div>

            {/* Navigation section */}
            <div className="py-1">
              <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted/40">
                Navigate
              </p>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-[11px] transition-colors hover:bg-card-hover ${
                    pathname === link.href
                      ? "font-semibold text-f1-white"
                      : "text-muted hover:text-f1-white"
                  }`}
                >
                  <span className={pathname === link.href ? "text-f1-white" : "text-muted/60"}>
                    {link.icon}
                  </span>
                  {link.label}
                  {link.highlight && pathname !== link.href && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-f1-red animate-pulse" />
                  )}
                </Link>
              ))}
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[11px] transition-colors hover:bg-card-hover ${
                  pathname === "/profile"
                    ? "font-semibold text-f1-white"
                    : "text-muted hover:text-f1-white"
                }`}
              >
                <span className={pathname === "/profile" ? "text-f1-white" : "text-muted/60"}>
                  <User size={16} />
                </span>
                Profile
              </Link>
            </div>

            <div className="border-t border-border" />

            {/* Settings section */}
            <div className="py-1">
              <p className="px-3 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted/40">
                Settings
              </p>

              {/* Language */}
              <div className="px-3 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted">
                    <Globe size={12} className="text-muted/60" />
                    Language
                  </span>
                  <div className="flex rounded-md border border-border overflow-hidden">
                    <button className="px-2 py-0.5 text-[10px] font-semibold text-f1-white bg-card-hover">
                      EN
                    </button>
                    <button className="px-2 py-0.5 text-[10px] font-medium text-muted border-l border-border hover:text-f1-white transition-colors">
                      ES
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme */}
              <div className="px-3 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-muted">
                    <Moon size={12} className="text-muted/60" />
                    Theme
                  </span>
                  <div className="flex rounded-md border border-border overflow-hidden">
                    <button className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-f1-white bg-card-hover">
                      <Moon size={9} />
                      Dark
                    </button>
                    <button className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-muted border-l border-border hover:text-f1-white transition-colors">
                      <Sun size={9} />
                      Light
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Sign Out */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowSignOutModal(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-f1-red/80 transition-colors hover:bg-card-hover hover:text-f1-red"
              >
                <LogOut size={13} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isSigningOut && setShowSignOutModal(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-f1-red/15">
                <LogOut size={15} className="text-f1-red" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-f1-white">Sign out?</h2>
                <p className="mt-0.5 text-[11px] text-muted">Signed in as {displayName}</p>
              </div>
            </div>
            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-xs leading-relaxed text-muted">
                You will be redirected to the login page. Your predictions and data are safely saved.
              </p>
            </div>
            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <button
                onClick={() => setShowSignOutModal(false)}
                disabled={isSigningOut}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-1.5 rounded-lg bg-f1-red px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-f1-red/80 disabled:opacity-50"
              >
                {isSigningOut ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
