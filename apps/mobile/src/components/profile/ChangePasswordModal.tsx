import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from "react-native";

import { AuthTextInput } from "@/components/auth/AuthTextInput";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful update so the parent can flash a message. */
  onSuccess: () => void;
}

/**
 * Ports the web change-password modal (email-provider users only): new +
 * confirm fields with show/hide toggles, min-8 check, mismatch hint, then
 * supabase.auth.updateUser({ password }).
 */
export function ChangePasswordModal({ visible, onClose, onSuccess }: ChangePasswordModalProps) {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  async function handleUpdate() {
    if (!newPassword || newPassword !== confirmPassword) {
      setError(t.profilePage.passwordsDoNotMatchError);
      return;
    }
    if (newPassword.length < 8) {
      setError(t.profilePage.passwordTooShort);
      return;
    }

    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    reset();
    onClose();
    onSuccess();
  }

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center bg-black/60 p-6"
      >
        <View className="w-full max-w-sm overflow-hidden rounded-2xl border border-f1-white/10 bg-f1-black">
          {/* Header */}
          <View className="flex-row items-center gap-3 border-b border-f1-white/10 px-5 py-4">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-f1-blue/10">
              <Ionicons name="key-outline" size={16} color="#3C91E6" />
            </View>
            <Text className="text-base font-semibold text-f1-white">
              {t.profilePage.changePasswordTitle}
            </Text>
          </View>

          {/* Body */}
          <View className="gap-4 px-5 py-4">
            {error ? (
              <View className="rounded-lg border border-f1-red/20 bg-f1-red/10 px-3 py-2.5">
                <Text className="text-sm text-f1-red">{error}</Text>
              </View>
            ) : null}

            <AuthTextInput
              label={t.profilePage.newPassword}
              placeholder={t.profilePage.newPasswordPlaceholder}
              value={newPassword}
              onChangeText={setNewPassword}
              secure
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!loading}
            />

            <View className="gap-1.5">
              <AuthTextInput
                label={t.profilePage.confirmNewPassword}
                placeholder={t.profilePage.confirmNewPasswordPlaceholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secure
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />
              {mismatch ? (
                <Text className="text-xs text-f1-red">{t.profilePage.passwordsDoNotMatch}</Text>
              ) : null}
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-3 border-t border-f1-white/10 px-5 py-4">
            <Pressable
              onPress={handleClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t.profilePage.cancel}
              className={`min-h-11 flex-1 items-center justify-center rounded-lg border border-f1-white/10 active:bg-f1-white/10 ${
                loading ? "opacity-50" : ""
              }`}
            >
              <Text className="text-sm font-medium text-f1-white">{t.profilePage.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={handleUpdate}
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              accessibilityRole="button"
              accessibilityLabel={t.profilePage.updatePassword}
              className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-f1-blue active:bg-f1-blue/80 ${
                loading || !newPassword || newPassword !== confirmPassword ? "opacity-50" : ""
              }`}
            >
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Text className="text-sm font-semibold text-white">
                {loading ? t.profilePage.updating : t.profilePage.updatePassword}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
