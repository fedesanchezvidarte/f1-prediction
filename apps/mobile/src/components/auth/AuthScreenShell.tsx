import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";

/**
 * Shared scaffold for the auth screens: dark full-screen background,
 * language switcher pinned top-right, F1 wordmark, and a centered card —
 * mirroring the web auth pages' layout.
 */
export function AuthScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="items-end px-4 pt-2">
          <AuthLanguageSwitcher />
        </View>
        <ScrollView
          contentContainerClassName="flex-grow justify-center gap-8 px-4 py-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center">
            <Text className="text-4xl font-black italic text-f1-white">
              F1 <Text className="text-f1-red">Prediction</Text>
            </Text>
          </View>
          <View className="w-full max-w-sm self-center gap-6 rounded-2xl border border-f1-white/10 bg-f1-white/5 p-6">
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
