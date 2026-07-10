import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { createSessionFromUrl } from "@/lib/auth";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import "../global.css";

const queryClient = new QueryClient();

function RootNavigator() {
  const { session, isLoading } = useAuth();

  // Safety net for auth deep links that arrive outside the
  // openAuthSessionAsync round-trip (e.g. some Android browsers deliver the
  // OAuth redirect as a plain link, or the user taps an email link).
  // Re-processing a URL that was already exchanged is harmless: the second
  // exchange fails and the catch swallows it.
  const url = Linking.useURL();
  useEffect(() => {
    if (url) createSessionFromUrl(url).catch(() => {});
  }, [url]);

  // Until the persisted session is restored we don't know which route group
  // to show — render a plain spinner instead of flashing the login screen.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-f1-black">
        <ActivityIndicator color="#CF2637" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#2A2B2A" } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
