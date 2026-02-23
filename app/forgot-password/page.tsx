"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { F1Logo } from "@/components/F1Logo";
import { AuthFooter } from "@/components/AuthFooter";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

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
              <Mail size={28} className="text-f1-blue" />
            </div>
            <h2 className="text-2xl font-semibold text-f1-white">
              {t.forgotPassword.checkEmail}
            </h2>
            <p className="text-sm text-muted">
              {t.forgotPassword.resetLinkSent}{" "}
              <span className="font-medium text-f1-white">{email}</span>,{" "}
              {t.forgotPassword.resetLinkSentSuffix}
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-f1-white transition-colors hover:text-f1-red"
            >
              {t.forgotPassword.backToLogin}
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
              {t.forgotPassword.title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t.forgotPassword.subtitle}
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                {t.forgotPassword.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t.forgotPassword.emailPlaceholder}
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
              {loading ? t.forgotPassword.sendingLink : t.forgotPassword.sendResetLink}
            </button>
          </form>

          <p className="text-center text-sm text-muted">
            {t.forgotPassword.rememberPassword}{" "}
            <Link
              href="/login"
              className="font-medium text-f1-white transition-colors hover:text-f1-red"
            >
              {t.forgotPassword.signIn}
            </Link>
          </p>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}
