import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { AuthTextInput } from "@/components/auth/AuthTextInput";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";

export default function RegisterScreen() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleRegister() {
    setError(null);
    setLoading(true);

    // No emailRedirectTo: the confirmation link falls back to the Supabase
    // Site URL (the web app), same account either way — after confirming,
    // the user signs in here.
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
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

  async function handleGoogleSignUp() {
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

  if (success) {
    return (
      <AuthScreenShell>
        <View className="items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-f1-green/10">
            <Ionicons name="checkmark" size={32} color="#44AF69" />
          </View>
          <Text className="text-2xl font-semibold text-f1-white text-center">
            {t.register.checkEmail}
          </Text>
          <Text className="text-sm text-f1-white/60 text-center">
            {t.register.confirmationSent}{" "}
            <Text className="font-medium text-f1-white">{email.trim()}</Text>.{" "}
            {t.register.clickToVerify}
          </Text>
          <Link href="/login" asChild>
            <Pressable hitSlop={8} className="mt-2">
              <Text className="text-sm font-medium text-f1-white">
                {t.register.backToLogin}
              </Text>
            </Pressable>
          </Link>
        </View>
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell>
      <View className="items-center gap-1">
        <Text className="text-3xl font-semibold text-f1-white">
          {t.register.title}!
        </Text>
        <Text className="text-sm text-f1-white/60 text-center">
          {t.register.subtitle}
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
        label={t.register.continueWithGoogle}
        onPress={handleGoogleSignUp}
        disabled={busy}
      />

      <View className="flex-row items-center gap-3">
        <View className="h-px flex-1 bg-f1-white/10" />
        <Text className="text-xs text-f1-white/50">{t.register.or}</Text>
        <View className="h-px flex-1 bg-f1-white/10" />
      </View>

      <View className="gap-4">
        <AuthTextInput
          label={t.register.fullName}
          value={name}
          onChangeText={setName}
          placeholder={t.register.fullNamePlaceholder}
          autoComplete="name"
          textContentType="name"
        />

        <AuthTextInput
          label={t.register.email}
          value={email}
          onChangeText={setEmail}
          placeholder={t.register.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <AuthTextInput
          label={t.register.password}
          value={password}
          onChangeText={setPassword}
          placeholder={t.register.passwordPlaceholder}
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />

        {error ? (
          <View className="rounded-lg border border-f1-amber/20 bg-f1-amber/10 px-4 py-3">
            <Text className="text-sm text-f1-amber">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleRegister}
          disabled={busy || !name || !email || password.length < 6}
          accessibilityRole="button"
          className={`w-full flex-row items-center justify-center gap-2 rounded-lg bg-f1-red px-4 py-3 active:bg-f1-red-hover ${
            busy || !name || !email || password.length < 6 ? "opacity-50" : ""
          }`}
        >
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text className="text-sm font-semibold text-white">
            {loading ? t.register.creatingAccount : t.register.createAccount}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center gap-1">
        <Text className="text-sm text-f1-white/60">
          {t.register.alreadyHaveAccount}
        </Text>
        <Link href="/login" asChild>
          <Pressable hitSlop={8}>
            <Text className="text-sm font-medium text-f1-white">
              {t.register.signIn}
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenShell>
  );
}
