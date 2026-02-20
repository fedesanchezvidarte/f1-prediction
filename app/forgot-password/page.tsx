"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { F1Logo } from "@/components/F1Logo";
import { AuthFooter } from "@/components/AuthFooter";

/**
 * Page to reset the password for a user
 * @returns - The forgot password page
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-between bg-background px-4">
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8">
          <F1Logo />
          <div className="w-full space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-f1-blue/10">
              <svg
                className="h-8 w-8 text-f1-blue"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-f1-white">
              Check your email
            </h2>
            <p className="text-sm text-muted">
              If an account exists for{" "}
              <span className="font-medium text-f1-white">{email}</span>,
              we&apos;ve sent a password reset link.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-f1-white transition-colors hover:text-f1-red"
            >
              Back to login
            </Link>
          </div>
        </div>
        <AuthFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background px-4">
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8">
        <F1Logo />

        <div className="w-full space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-f1-white">
              Reset your password
            </h2>
            <p className="mt-1 text-sm text-muted">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-border bg-input-bg px-4 py-3 text-sm text-f1-white placeholder-muted outline-none transition-colors focus:border-f1-red"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-f1-amber/20 bg-f1-amber/10 px-4 py-3 text-sm text-f1-amber">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-f1-red px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-f1-red-hover disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send reset link"}
            </button>
          </form>

          <p className="text-center text-sm text-muted">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-f1-white transition-colors hover:text-f1-red"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}
