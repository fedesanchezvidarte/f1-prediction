import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { createSessionFromUrl } from "@/lib/auth";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import "../global.css";

const queryClient = new QueryClient();

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const { colors } = useTheme();

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
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function ThemedStatusBar() {
  const { resolvedTheme } = useTheme();
  // StatusBar style names the icon color, so it's the inverse of the theme.
  return <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    // GestureHandlerRootView is required by the profile drawer's gestures.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ThemedStatusBar />
              <RootNavigator />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
