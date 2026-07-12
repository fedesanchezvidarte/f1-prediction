import { Drawer } from "expo-router/drawer";

import { ProfileDrawerContent } from "@/components/profile/ProfileDrawerContent";

/**
 * Signed-in group wrapped in a right-side Drawer whose content is a compact
 * profile/settings panel (ProfileDrawerContent). The avatar button in the
 * tab headers opens it. The full-screen /profile route stays a plain drawer
 * screen so avatar upload, name edit and account deletion remain reachable
 * from the drawer's "Profile" row. This whole group sits behind the session
 * guard in the root layout.
 */
export default function AppLayout() {
  return (
    <Drawer
      drawerContent={(props) => <ProfileDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: "right",
        drawerType: "front",
        swipeEnabled: true,
        swipeEdgeWidth: 60,
        drawerStyle: { backgroundColor: "#2A2B2A", width: 300 },
        overlayColor: "rgba(0,0,0,0.6)",
        sceneStyle: { backgroundColor: "#2A2B2A" },
      }}
    >
      <Drawer.Screen name="(tabs)" />
      <Drawer.Screen name="profile" options={{ swipeEnabled: false }} />
    </Drawer>
  );
}
