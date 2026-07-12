import { Stack } from "expo-router";

/**
 * Signed-in stack: the bottom tab navigator plus screens presented above it.
 * The Profile screen opens as a full-screen modal from the avatar button in
 * every tab header. This whole group sits behind the session guard in the
 * root layout, so the modal inherits auth protection.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#2A2B2A" } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" options={{ presentation: "modal" }} />
    </Stack>
  );
}
