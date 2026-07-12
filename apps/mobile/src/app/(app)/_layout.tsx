import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Bottom tab navigator for the signed-in app: Home, Predictions,
 * Leaderboard, Standings and Achievements. Uses the same F1 dark theme as
 * the previous stack header (Graphite backgrounds, Crimson active tint).
 */
export default function AppLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#2A2B2A" },
        headerTintColor: "#F7F7F7",
        sceneStyle: { backgroundColor: "#2A2B2A" },
        tabBarStyle: { backgroundColor: "#2A2B2A", borderTopColor: "rgba(247,247,247,0.1)" },
        tabBarActiveTintColor: "#CF2637",
        tabBarInactiveTintColor: "rgba(247,247,247,0.5)",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.dashboard,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="race-prediction"
        options={{
          title: t.nav.predictions,
          tabBarIcon: ({ color, size }) => <Ionicons name="flag" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t.nav.leaderboard,
          tabBarIcon: ({ color, size }) => <Ionicons name="podium" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: t.nav.standings,
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: t.nav.achievements,
          tabBarIcon: ({ color, size }) => <Ionicons name="ribbon" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
