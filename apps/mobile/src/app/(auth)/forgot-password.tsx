import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { AuthScreenShell } from "@/components/auth/AuthScreenShell";
import { AuthTextInput } from "@/components/auth/AuthTextInput";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";

export default function ForgotPasswordScreen() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError(null);
    setLoading(true);

    // No redirectTo: the reset link falls back to the Supabase Site URL (the
    // web app), where the existing reset-password flow completes. The new
    // password then works here too — one account, one backend.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

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
      <AuthScreenShell>
        <View className="items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-f1-green/10">
            <Ionicons name="mail-outline" size={28} color="#44AF69" />
          </View>
          <Text className="text-2xl font-semibold text-f1-white text-center">
            {t.forgotPassword.checkEmail}
          </Text>
          <Text className="text-sm text-f1-white/60 text-center">
            {t.forgotPassword.resetLinkSent}{" "}
            <Text className="font-medium text-f1-white">{email.trim()}</Text>,{" "}
            {t.forgotPassword.resetLinkSentSuffix}
          </Text>
          <Link href="/login" asChild>
            <Pressable hitSlop={8} className="mt-2">
              <Text className="text-sm font-medium text-f1-white">
                {t.forgotPassword.backToLogin}
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
        <Text className="text-3xl font-semibold text-f1-white text-center">
          {t.forgotPassword.title}
        </Text>
        <Text className="text-sm text-f1-white/60 text-center">
          {t.forgotPassword.subtitle}
        </Text>
      </View>

      <View className="gap-4">
        <AuthTextInput
          label={t.forgotPassword.email}
          value={email}
          onChangeText={setEmail}
          placeholder={t.forgotPassword.emailPlaceholder}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />

        {error ? (
          <View className="rounded-lg border border-f1-amber/20 bg-f1-amber/10 px-4 py-3">
            <Text className="text-sm text-f1-amber">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleReset}
          disabled={loading || !email}
          accessibilityRole="button"
          className={`w-full flex-row items-center justify-center gap-2 rounded-lg bg-f1-red px-4 py-3 active:bg-f1-red-hover ${
            loading || !email ? "opacity-50" : ""
          }`}
        >
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text className="text-sm font-semibold text-white">
            {loading ? t.forgotPassword.sendingLink : t.forgotPassword.sendResetLink}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-center gap-1">
        <Text className="text-sm text-f1-white/60">
          {t.forgotPassword.rememberPassword}
        </Text>
        <Link href="/login" asChild>
          <Pressable hitSlop={8}>
            <Text className="text-sm font-medium text-f1-white">
              {t.forgotPassword.signIn}
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenShell>
  );
}
