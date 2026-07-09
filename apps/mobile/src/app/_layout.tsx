import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { LanguageProvider } from "@/providers/LanguageProvider";
import "../global.css";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#2A2B2A" },
            headerTintColor: "#F7F7F7",
            contentStyle: { backgroundColor: "#2A2B2A" },
          }}
        />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
