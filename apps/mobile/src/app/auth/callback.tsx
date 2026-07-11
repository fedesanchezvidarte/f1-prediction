import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/providers/AuthProvider";

/**
 * Landing screen for the OAuth deep link (exp://.../--/auth/callback or
 * f1prediction://auth/callback). On some Android browsers the redirect
 * arrives as a plain link, so Expo Router navigates here while the root
 * layout's useURL() handler exchanges the ?code= for a session. Show a
 * spinner until that lands, then forward home — Stack.Protected resolves
 * "/" to the app when signed in or back to the login screen if the
 * exchange failed (10s safety timeout).
 */
export default function AuthCallbackScreen() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (session) {
      router.replace("/");
      return;
    }
    const timeout = setTimeout(() => router.replace("/"), 10_000);
    return () => clearTimeout(timeout);
  }, [session, isLoading, router]);

  return (
    <View className="flex-1 items-center justify-center bg-f1-black">
      <ActivityIndicator color="#CF2637" />
    </View>
  );
}
