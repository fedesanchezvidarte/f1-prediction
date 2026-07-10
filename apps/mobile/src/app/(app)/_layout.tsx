import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#2A2B2A" },
        headerTintColor: "#F7F7F7",
        contentStyle: { backgroundColor: "#2A2B2A" },
      }}
    />
  );
}
