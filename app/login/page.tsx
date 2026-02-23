"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { F1Logo } from "@/components/F1Logo";
import { AuthFooter } from "@/components/AuthFooter";
import { GoogleIcon } from "@/components/GoogleIcon";
import { useLanguage } from "@/components/providers/LanguageProvider";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLanguage();

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleGoogleLogin() {
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-background px-4">
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8">
        <F1Logo />

        <div className="w-full space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-f1-white">
              {t.login.title}!
            </h2>
            <p className="mt-1 text-sm text-muted">
              {t.login.subtitle}
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-muted/60">
              {t.login.disclaimerLine1}
              <br />
              <strong className="font-semibold text-foreground">{t.login.disclaimerLine2Emphasis}</strong>
              {" — "}
              <strong className="font-black">{t.login.disclaimerLine2Suffix}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-f1-white transition-colors hover:border-border-hover hover:bg-card-hover"
          >
            <GoogleIcon />
            {t.login.continueWithGoogle}
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">{t.login.or}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                {t.login.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t.login.emailPlaceholder}
                className="w-full rounded-lg border border-border bg-input-bg px-4 py-3 text-sm text-f1-white placeholder-muted outline-none transition-colors focus:border-f1-red"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  {t.login.password}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted transition-colors hover:text-f1-red"
                >
                  {t.login.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={t.login.passwordPlaceholder}
                  className="w-full rounded-lg border border-border bg-input-bg px-4 py-3 pr-11 text-sm text-f1-white placeholder-muted outline-none transition-colors focus:border-f1-red"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-f1-white"
                  aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
              {loading ? t.login.signingIn : t.login.signIn}
            </button>
          </form>

          <p className="text-center text-sm text-muted">
            {t.login.noAccount}{" "}
            <Link
              href="/register"
              className="font-medium text-f1-white transition-colors hover:text-f1-red"
            >
              {t.login.createAccount}
            </Link>
          </p>
        </div>
      </div>

      <AuthFooter />
    </div>
  );
}
