import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";

import { AuthTextInput } from "@/components/auth/AuthTextInput";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";

interface DeleteAccountModalProps {
  visible: boolean;
  /** The signed-in user's email (re-auth / confirmation target). */
  email: string;
  /** "email" (password re-auth) or an OAuth provider (type-email confirm). */
  authProvider: string;
  onClose: () => void;
}

/**
 * Ports the web delete-account flow exactly: email-provider users
 * re-authenticate with their password (signInWithPassword), Google users
 * type their email; then `rpc("delete_own_account")` and sign out — the
 * root layout's session guard swaps back to the auth group.
 */
export function DeleteAccountModal({ visible, email, authProvider, onClose }: DeleteAccountModalProps) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailProvider = authProvider === "email";
  const confirmDisabled =
    loading || (isEmailProvider ? !password : !emailConfirm.trim());

  function handleClose() {
    if (loading) return;
    setPassword("");
    setEmailConfirm("");
    setError(null);
    onClose();
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);

    if (isEmailProvider) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(t.profilePage.incorrectPassword);
        setLoading(false);
        return;
      }
    } else if (emailConfirm.trim().toLowerCase() !== email.toLowerCase()) {
      setError(t.profilePage.emailDoesNotMatch);
      setLoading(false);
      return;
    }

    const { error: deleteError } = await supabase.rpc("delete_own_account");

    if (deleteError) {
      setError(t.profilePage.failedToDelete);
      setLoading(false);
      return;
    }

    // Session guard in the root layout redirects to the auth group.
    await supabase.auth.signOut();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center bg-black/60 p-6"
      >
        <View className="w-full max-w-sm overflow-hidden rounded-2xl border border-f1-red/40 bg-f1-black">
          {/* Header — red tint */}
          <View className="flex-row items-center gap-3 border-b border-f1-red/20 bg-f1-red/5 px-5 py-4">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-f1-red/20">
              <Ionicons name="warning-outline" size={16} color="#CF2637" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-f1-red">
                {t.profilePage.deleteAccountTitle}
              </Text>
              <Text className="mt-0.5 text-xs text-f1-red/60">
                {t.profilePage.deleteCannotBeUndone}
              </Text>
            </View>
          </View>

          {/* Body */}
          <View className="gap-4 px-5 py-4">
            <Text className="text-sm leading-5 text-f1-white/70">
              {t.profilePage.deleteBody}{" "}
              <Text className="font-medium text-f1-white">
                {t.profilePage.deletePredictionsPointsAchievements}
              </Text>{" "}
              {t.profilePage.deleteBodySuffix}
            </Text>

            {error ? (
              <View className="rounded-lg border border-f1-red/20 bg-f1-red/10 px-3 py-2.5">
                <Text className="text-sm text-f1-red">{error}</Text>
              </View>
            ) : null}

            {isEmailProvider ? (
              <AuthTextInput
                label={t.profilePage.confirmWithPassword}
                placeholder={t.profilePage.confirmPasswordPlaceholder}
                value={password}
                onChangeText={setPassword}
                secure
                autoCapitalize="none"
                autoComplete="current-password"
                editable={!loading}
              />
            ) : (
              <AuthTextInput
                label={t.profilePage.typeEmailToConfirm}
                placeholder={email}
                value={emailConfirm}
                onChangeText={setEmailConfirm}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
            )}
          </View>

          {/* Actions */}
          <View className="flex-row items-center justify-end gap-2 border-t border-f1-red/20 px-5 py-3">
            <Pressable
              onPress={handleClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t.profilePage.cancel}
              className={`min-h-11 items-center justify-center rounded-lg border border-f1-white/10 px-4 active:bg-f1-white/10 ${
                loading ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-medium text-f1-white/70">{t.profilePage.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              disabled={confirmDisabled}
              accessibilityRole="button"
              accessibilityLabel={t.profilePage.deleteConfirm}
              className={`min-h-11 flex-row items-center justify-center gap-2 rounded-lg bg-f1-red px-4 active:bg-f1-red-hover ${
                confirmDisabled ? "opacity-50" : ""
              }`}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
              )}
              <Text className="text-sm font-semibold text-white">
                {loading ? t.profilePage.deleting : t.profilePage.deleteConfirm}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
