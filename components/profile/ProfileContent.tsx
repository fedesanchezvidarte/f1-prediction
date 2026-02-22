"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Mail,
  Trophy,
  Medal,
  Star,
  Calendar,
  Pencil,
  Check,
  X,
  LogOut,
  Trash2,
  KeyRound,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

interface ProfileStats {
  totalPoints: number;
  rank: number | null;
  predictionsCount: number;
  achievementsCount: number;
}

interface ProfileContentProps {
  profile: Profile;
  stats: ProfileStats;
  authProvider: string;
}

export function ProfileContent({ profile, stats, authProvider }: ProfileContentProps) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === displayName) {
      setIsEditingName(false);
      setNameInput(displayName);
      return;
    }

    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", profile.id);

    if (updateError) {
      setError("Failed to update display name. Please try again.");
      setSaving(false);
      return;
    }

    setDisplayName(trimmed);
    setIsEditingName(false);
    setSaving(false);
    setSuccess("Display name updated!");
    setTimeout(() => setSuccess(null), 3000);
    router.refresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: deleteError } = await supabase.rpc("delete_own_account");

    if (deleteError) {
      setError(
        "Failed to delete account. Please contact support if the issue persists."
      );
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <User size={20} className="text-f1-red" />
        <h1 className="text-xl font-bold text-f1-white">Profile</h1>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="rounded-lg border border-f1-red/20 bg-f1-red/10 px-4 py-3 text-sm text-f1-red">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-f1-green/20 bg-f1-green/10 px-4 py-3 text-sm text-f1-green">
          {success}
        </div>
      )}

      {/* Avatar & Name Card */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-card ring-2 ring-border">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={displayName}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-f1-white">{initials}</span>
              )}
            </div>
          </div>

          {/* Name + Email */}
          <div className="flex flex-1 flex-col items-center gap-1 sm:items-start">
            {isEditingName ? (
              <div className="flex w-full items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") {
                      setIsEditingName(false);
                      setNameInput(displayName);
                    }
                  }}
                  maxLength={30}
                  autoFocus
                  className="w-full max-w-xs rounded-lg border border-border bg-input-bg px-3 py-2 text-lg font-bold text-f1-white outline-none transition-colors focus:border-f1-red"
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="rounded-lg bg-f1-green/20 p-2 text-f1-green transition-colors hover:bg-f1-green/30 disabled:opacity-50"
                  aria-label="Save name"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setNameInput(displayName);
                  }}
                  className="rounded-lg bg-card-hover p-2 text-muted transition-colors hover:text-f1-white"
                  aria-label="Cancel"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-f1-white">{displayName}</h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
                  aria-label="Edit display name"
                >
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <Mail size={14} />
              {profile.email}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted/60">
              <Calendar size={12} />
              Member since {memberSince}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Trophy size={18} className="text-f1-amber" />}
          label="Points"
          value={stats.totalPoints.toString()}
        />
        <StatCard
          icon={<Medal size={18} className="text-f1-purple" />}
          label="Rank"
          value={stats.rank ? `#${stats.rank}` : "—"}
        />
        <StatCard
          icon={<Star size={18} className="text-f1-green" />}
          label="Predictions"
          value={stats.predictionsCount.toString()}
        />
        <StatCard
          icon={<Star size={18} className="text-f1-blue" />}
          label="Achievements"
          value={stats.achievementsCount.toString()}
        />
      </div>

      {/* Quick Links */}
      <div className="overflow-hidden rounded-xl border border-border">
        <Link
          href="/race-prediction"
          className="flex items-center justify-between border-b border-border px-4 py-3.5 transition-colors hover:bg-card-hover"
        >
          <div className="flex items-center gap-3">
            <Trophy size={16} className="text-muted" />
            <span className="text-sm text-f1-white">My Predictions</span>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </Link>
        <Link
          href="/leaderboard"
          className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-card-hover"
        >
          <div className="flex items-center gap-3">
            <Medal size={16} className="text-muted" />
            <span className="text-sm text-f1-white">Leaderboard</span>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </Link>
      </div>

      {/* Account Actions */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted/50">
            Account
          </h3>
        </div>

        {authProvider === "email" && (
          <Link
            href="/forgot-password"
            className="flex items-center justify-between border-b border-border px-4 py-3.5 transition-colors hover:bg-card-hover"
          >
            <div className="flex items-center gap-3">
              <KeyRound size={16} className="text-muted" />
              <span className="text-sm text-f1-white">Change Password</span>
            </div>
            <ChevronRight size={16} className="text-muted" />
          </Link>
        )}

        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 transition-colors hover:bg-card-hover"
        >
          <LogOut size={16} className="text-muted" />
          <span className="text-sm text-f1-white">Sign Out</span>
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-card-hover"
        >
          <Trash2 size={16} className="text-f1-red/70" />
          <span className="text-sm text-f1-red/70">Delete Account</span>
        </button>
      </div>

      {/* Auth provider info */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted/40">
        <span>
          Signed in with {authProvider === "google" ? "Google" : "email & password"}
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-f1-red/10">
                <AlertTriangle size={20} className="text-f1-red" />
              </div>
              <h3 className="text-lg font-bold text-f1-white">Delete Account</h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              This action is permanent and cannot be undone. All your predictions,
              achievements, and data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-f1-white transition-colors hover:bg-card-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 rounded-lg bg-f1-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-f1-red-hover disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border p-4">
      {icon}
      <span className="text-lg font-bold text-f1-white">{value}</span>
      <span className="text-[11px] text-muted">{label}</span>
    </div>
  );
}
