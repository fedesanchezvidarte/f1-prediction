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
        <div className="hidden sm:block">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-f1-white">
              F1 Prediction
            </span>
            <span className="text-xs text-muted">Season 2026</span>
          </div>
        </div>
      </Link>

      <div className="relative flex items-center gap-3" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="group flex items-center gap-2.5 rounded-full px-3 py-1 transition-colors hover:bg-card-hover"
          aria-label="Open user menu"
        >
          <span className="text-sm text-muted transition-colors group-hover:text-f1-white">
            {displayName}
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-sm font-medium text-f1-white ring-1 ring-transparent transition-all group-hover:ring-border-hover">
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
          </div>
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-border bg-card py-1 shadow-xl">
            {/* Navigation Links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-card-hover ${
                  pathname === link.href
                    ? "font-medium text-f1-white"
                    : "text-muted hover:text-f1-white"
                }`}
              >
                {link.icon}
                {link.label}
                {link.highlight && pathname !== link.href && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-f1-red animate-pulse" />
                )}
              </Link>
            ))}

            <div className="my-1 border-t border-border" />

            {/* Profile */}
            <Link
              href="/profile"
              onClick={() => setIsMenuOpen(false)}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-card-hover ${
                pathname === "/profile"
                  ? "font-medium text-f1-white"
                  : "text-muted hover:text-f1-white"
              }`}
            >
              <User size={16} />
              Profile
            </Link>

            <div className="my-1 border-t border-border" />

            {/* Language Selection (placeholder) */}
            <div className="px-4 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted/50">
                Language
              </p>
              <div className="flex rounded-lg border border-border">
                <button
                  className="flex flex-1 items-center justify-center gap-1 rounded-l-lg bg-card-hover px-2 py-1.5 text-[11px] font-medium text-f1-white"
                >
                  <Globe size={12} />
                  EN
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-1 rounded-r-lg border-l border-border px-2 py-1.5 text-[11px] font-medium text-muted"
                >
                  ES
                </button>
              </div>
            </div>

            {/* Theme Selection (placeholder) */}
            <div className="px-4 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted/50">
                Theme
              </p>
              <div className="flex rounded-lg border border-border">
                <button
                  className="flex flex-1 items-center justify-center gap-1 rounded-l-lg bg-card-hover px-2 py-1.5 text-[11px] font-medium text-f1-white"
                >
                  <Moon size={12} />
                  Dark
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-1 rounded-r-lg border-l border-border px-2 py-1.5 text-[11px] font-medium text-muted"
                >
                  <Sun size={12} />
                  Light
                </button>
              </div>
            </div>

            <div className="my-1 border-t border-border" />

            {/* Sign Out */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                setShowSignOutModal(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-f1-red transition-colors hover:bg-card-hover"
            >
              <LogOut size={16} />
              Sign out
            </button>
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
