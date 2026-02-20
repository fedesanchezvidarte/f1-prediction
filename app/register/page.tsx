"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { F1Logo } from "@/components/F1Logo";
import { AuthFooter } from "@/components/AuthFooter";
import { GoogleIcon } from "@/components/GoogleIcon";

/**
 * Page to register a new user
 * @returns - The register page
 */
export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  /**
   * Handle the registration of a new user
   * @param e - The form event
   */
  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  /**
   * Handle the sign up with Google
   */
  async function handleGoogleSignUp() {
    setError(null);
    const supabase = createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
  }

  /**
   * If the user has successfully registered, show the success message
   * @returns - The success message
   */
  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-between bg-background px-4">
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8">
          <F1Logo />
          <div className="w-full space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-f1-green/10">
              <svg
                className="h-8 w-8 text-f1-green"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-f1-white">
              Check your email
            </h2>
            <p className="text-sm text-muted">
              We&apos;ve sent a confirmation link to{" "}
              <span className="font-medium text-f1-white">{email}</span>. Click
              the link to verify your account.
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

  /**
   * If the user has not successfully registered, show the registration form
   * @returns - The registration form
   */
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background px-4">
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8">
        <F1Logo />

        <div className="w-full space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-f1-white">
              Create your account
            </h2>
            <p className="mt-1 text-sm text-muted">
              Join the race and start predicting
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-f1-white transition-colors hover:border-border-hover hover:bg-card-hover"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-foreground"
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Juan Manuel Fangio"
                className="w-full rounded-lg border border-border bg-input-bg px-4 py-3 text-sm text-f1-white placeholder-muted outline-none transition-colors focus:border-f1-red"
              />
            </div>

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

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
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
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted">
            Already have an account?{" "}
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
