import { Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { AuthTextInput } from "@/components/auth/AuthTextInput";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";

// No-op on native; closes the popup on web. Standard expo-web-browser wiring.
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // On success there is no navigation to do: onAuthStateChange flips the
  // session in AuthProvider and the root Stack.Protected swaps (auth) → (app).
  async function handleEmailLogin() {
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGoogleLoading(false);
    }
  }

  const busy = loading || googleLoading;

  return (
    <AuthScreenShell>
      <View className="items-center gap-1">
        <Text className="text-3xl font-semibold text-f1-white">
          {t.login.title}!
        </Text>
        <Text className="text-sm text-f1-white/60 text-center">
          {t.login.subtitle}
        </Text>
        <Text className="mt-3 text-[11px] leading-relaxed text-f1-white/40 text-center">
          {t.login.disclaimerLine1}
          {"\n"}
          <Text className="font-semibold text-f1-white/70">
            {t.login.disclaimerLine2Emphasis}
          </Text>
          {" — "}
          <Text className="font-black text-f1-white/70">
            {t.login.disclaimerLine2Suffix}
          </Text>
        </Text>
      </View>

      <GoogleSignInButton
        label={t.login.continueWithGoogle}
        onPress={handleGoogleLogin}
        disabled={busy}
      />

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-f1-white/10" />
        <Text className="text-xs text-f1-white/50">{t.login.or}</Text>
        <View className="h-px flex-1 bg-f1-white/10" />
      </View>

      <View className="gap-4">
        <AuthTextInput
          label={t.login.email}
          value={email}
          onChangeText={setEmail}
          placeholder={t.login.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <AuthTextInput
          label={t.login.password}
          value={password}
          onChangeText={setPassword}
          placeholder={t.login.passwordPlaceholder}
          secure
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          labelAccessory={
            <Link href="/forgot-password" asChild>
              <Pressable hitSlop={8}>
                <Text className="text-xs text-f1-white/50">
                  {t.login.forgotPassword}
                </Text>
              </Pressable>
            </Link>
          }
        />

        {error ? (
          <View className="rounded-lg border border-f1-amber/20 bg-f1-amber/10 px-4 py-3">
            <Text className="text-sm text-f1-amber">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleEmailLogin}
          disabled={busy || !email || !password}
          accessibilityRole="button"
          className={`w-full flex-row items-center justify-center gap-2 rounded-lg bg-f1-red px-4 py-3 active:bg-f1-red-hover ${
            busy || !email || !password ? "opacity-50" : ""
          }`}
        >
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text className="text-sm font-semibold text-white">
            {loading ? t.login.signingIn : t.login.signIn}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center gap-1">
        <Text className="text-sm text-f1-white/60">{t.login.noAccount}</Text>
        <Link href="/register" asChild>
          <Pressable hitSlop={8}>
            <Text className="text-sm font-medium text-f1-white">
              {t.login.createAccount}
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenShell>
  );
}
