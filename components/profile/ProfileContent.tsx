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
  Award,
  Calendar,
  Pencil,
  Check,
  X,
  LogOut,
  Trash2,
  KeyRound,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PasswordStrengthMeter } from "@/components/ui/PasswordStrengthMeter";
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
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
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
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setChangePasswordLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(updateError.message);
      setChangePasswordLoading(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setShowChangePassword(false);
    setChangePasswordLoading(false);
    setSuccess("Password updated successfully!");
    setTimeout(() => setSuccess(null), 3000);
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setError(null);

    const supabase = createClient();

    if (authProvider === "email") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: deletePassword,
      });
      if (signInError) {
        setError("Incorrect password. Please try again.");
        setDeleteLoading(false);
        return;
      }
    } else {
      if (deleteEmailConfirm.trim().toLowerCase() !== profile.email.toLowerCase()) {
        setError("Email address does not match. Please try again.");
        setDeleteLoading(false);
        return;
      }
    }

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
    <div className="space-y-4">
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

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-border">

        {/* ── Header ── */}
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <User size={16} className="text-f1-red" />
          <h1 className="text-sm font-semibold text-f1-white">Profile</h1>
        </div>

        {/* ── Avatar & Name ── */}
        <div className="flex flex-col items-center gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card ring-2 ring-border">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={displayName}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-f1-white">{initials}</span>
            )}
          </div>

          {/* Name + meta */}
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
                  className="w-full max-w-xs rounded-lg border border-border bg-input-bg px-3 py-1.5 text-base font-bold text-f1-white outline-none transition-colors focus:border-f1-red"
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="rounded-lg bg-f1-green/20 p-1.5 text-f1-green transition-colors hover:bg-f1-green/30 disabled:opacity-50"
                  aria-label="Save name"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setNameInput(displayName);
                  }}
                  className="rounded-lg bg-card-hover p-1.5 text-muted transition-colors hover:text-f1-white"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-f1-white">{displayName}</span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
                  aria-label="Edit display name"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Mail size={12} />
              {profile.email}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted/50">
              <Calendar size={11} />
              Member since {memberSince}
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
          <StatCell
            icon={<Trophy size={15} className="text-f1-amber" />}
            label="Points"
            value={stats.totalPoints.toString()}
          />
          <StatCell
            icon={<Medal size={15} className="text-f1-purple" />}
            label="Rank"
            value={stats.rank ? `#${stats.rank}` : "—"}
          />
          <StatCell
            icon={<Star size={15} className="text-f1-green" />}
            label="Predictions"
            value={stats.predictionsCount.toString()}
          />
          <StatCell
            icon={<Star size={15} className="text-f1-blue" />}
            label="Achievements"
            value={stats.achievementsCount.toString()}
          />
        </div>

        {/* ── Quick links section header ── */}
        <div className="border-b border-border px-5 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted/50">
            Navigate
          </p>
        </div>

        {/* ── Quick links ── */}
        <Link
          href="/race-prediction"
          className="flex items-center justify-between border-b border-border px-5 py-3.5 transition-colors hover:bg-card-hover"
        >
          <div className="flex items-center gap-3">
            <Trophy size={15} className="text-muted" />
            <span className="text-sm text-f1-white">My Predictions</span>
          </div>
          <ChevronRight size={15} className="text-muted" />
        </Link>
        <Link
          href="/leaderboard"
          className="flex items-center justify-between border-b border-border px-5 py-3.5 transition-colors hover:bg-card-hover"
        >
          <div className="flex items-center gap-3">
            <Medal size={15} className="text-muted" />
            <span className="text-sm text-f1-white">Leaderboard</span>
          </div>
          <ChevronRight size={15} className="text-muted" />
        </Link>
        <Link
          href="/achievements"
          className="flex items-center justify-between border-b border-border px-5 py-3.5 transition-colors hover:bg-card-hover"
        >
          <div className="flex items-center gap-3">
            <Award size={15} className="text-muted" />
            <span className="text-sm text-f1-white">Achievements</span>
          </div>
          <ChevronRight size={15} className="text-muted" />
        </Link>

        {/* ── Account section header ── */}
        <div className="border-b border-border px-5 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted/50">
            Account
          </p>
        </div>

        {/* ── Account actions ── */}
        {authProvider === "email" && (
          <button
            onClick={() => {
              setShowChangePassword(true);
              setError(null);
            }}
            className="flex w-full items-center justify-between border-b border-border px-5 py-3.5 transition-colors hover:bg-card-hover"
          >
            <div className="flex items-center gap-3">
              <KeyRound size={15} className="text-muted" />
              <span className="text-sm text-f1-white">Change Password</span>
            </div>
            <ChevronRight size={15} className="text-muted" />
          </button>
        )}

        <button
          onClick={() => setShowSignOutModal(true)}
          className="flex w-full items-center gap-3 border-b border-border px-5 py-3.5 transition-colors hover:bg-card-hover"
        >
          <LogOut size={15} className="text-muted" />
          <span className="text-sm text-f1-white">Sign Out</span>
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex w-full items-center gap-3 px-5 py-3.5 transition-colors hover:bg-card-hover"
        >
          <Trash2 size={15} className="text-f1-red/70" />
          <span className="text-sm text-f1-red/70">Delete Account</span>
        </button>
      </div>

      {/* Auth provider info */}
      <p className="text-center text-[11px] text-muted/40">
        Signed in with {authProvider === "google" ? "Google" : "email & password"}
      </p>

      {/* ── Change Password Modal ── */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-f1-blue/10">
                <KeyRound size={16} className="text-f1-blue" />
              </div>
              <h3 className="text-sm font-semibold text-f1-white">Change Password</h3>
            </div>

            <div className="space-y-4 px-5 py-4">
              {error && (
                <div className="rounded-lg border border-f1-red/20 bg-f1-red/10 px-3 py-2.5 text-sm text-f1-red">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-border bg-input-bg px-3 py-2.5 pr-10 text-sm text-f1-white placeholder-muted outline-none transition-colors focus:border-f1-red"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-f1-white"
                  >
                    {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-border bg-input-bg px-3 py-2.5 pr-10 text-sm text-f1-white placeholder-muted outline-none transition-colors focus:border-f1-red"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-f1-white"
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1.5 text-[11px] text-f1-red">Passwords do not match.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-border px-5 py-4">
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                }}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-f1-white transition-colors hover:bg-card-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changePasswordLoading || !newPassword || newPassword !== confirmPassword}
                className="flex-1 rounded-lg bg-f1-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-f1-blue/80 disabled:opacity-50"
              >
                {changePasswordLoading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign Out Confirmation Modal ── */}
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

      {/* ── Delete Account Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleteLoading) {
                setShowDeleteConfirm(false);
                setDeletePassword("");
                setDeleteEmailConfirm("");
                setError(null);
              }
            }}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-f1-red/40 bg-card shadow-2xl">
            {/* Header — red tint */}
            <div className="flex items-center gap-3 border-b border-f1-red/20 bg-f1-red/5 px-5 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-f1-red/20">
                <AlertTriangle size={15} className="text-f1-red" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-f1-red">Delete account</h2>
                <p className="mt-0.5 text-[11px] text-f1-red/60">This cannot be undone</p>
              </div>
            </div>
            {/* Body — red tint */}
            <div className="bg-f1-red/3 px-5 py-4">
              <p className="text-xs leading-relaxed text-muted">
                All your{" "}
                <span className="font-medium text-f1-white">predictions, points, and achievements</span>{" "}
                will be permanently deleted. There is no way to recover your account after this action.
              </p>
              {authProvider === "email" ? (
                <div className="mt-4">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-f1-red/70">
                    Confirm with your password
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePassword ? "text" : "password"}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-lg border border-f1-red/30 bg-input-bg px-3 py-2.5 pr-10 text-sm text-f1-white placeholder-muted outline-none transition-colors focus:border-f1-red"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-f1-white"
                    >
                      {showDeletePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-f1-red/70">
                    Type your email to confirm
                  </label>
                  <input
                    type="email"
                    value={deleteEmailConfirm}
                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                    placeholder={profile.email}
                    className="w-full rounded-lg border border-f1-red/30 bg-input-bg px-3 py-2.5 text-sm text-f1-white placeholder-muted outline-none transition-colors focus:border-f1-red"
                  />
                </div>
              )}
            </div>
            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-f1-red/20 bg-f1-red/3 px-5 py-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword("");
                  setDeleteEmailConfirm("");
                  setError(null);
                }}
                disabled={deleteLoading}
                className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={
                  deleteLoading ||
                  (authProvider === "email" && !deletePassword) ||
                  (authProvider !== "email" && !deleteEmailConfirm.trim())
                }
                className="flex items-center gap-1.5 rounded-lg bg-f1-red px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-f1-red/80 disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {deleteLoading ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-4">
      {icon}
      <span className="text-base font-bold tabular-nums text-f1-white">{value}</span>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}
