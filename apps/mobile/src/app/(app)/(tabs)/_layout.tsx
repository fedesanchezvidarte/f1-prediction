import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";

import { AppLogo } from "@/components/layout/AppLogo";
import { HeaderAvatarButton } from "@/components/profile/HeaderAvatarButton";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

/** Tab icon: outline while inactive, solid once selected (iOS convention). */
function TabIcon({
  name,
  color,
  focused,
}: {
  name: "home" | "flag" | "podium" | "trophy" | "ribbon";
  color: string;
  focused: boolean;
}) {
  return <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />;
}

/**
 * Bottom tab navigator for the signed-in app: Home, Predictions,
 * Leaderboard, Standings and Achievements. Header/tab bar colors come from
 * the active theme palette (Crimson active tint in both themes). Every tab
 * header shows the app logo on the left and the avatar button (opens the
 * profile drawer) on the right.
 */
export default function TabsLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerLeft: () => (
          <View className="pl-4">
            <AppLogo size={26} />
          </View>
        ),
        headerRight: () => <HeaderAvatarButton />,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: colors.foregroundMuted,
        // Smaller glyphs + label than the defaults so five tabs breathe on a
        // 4.7" screen and "Achievements" stops truncating.
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.dashboard,
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="race-prediction"
        options={{
          title: t.nav.predictions,
          tabBarIcon: ({ color, focused }) => <TabIcon name="flag" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t.nav.leaderboard,
          tabBarIcon: ({ color, focused }) => <TabIcon name="podium" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: t.nav.standings,
          tabBarIcon: ({ color, focused }) => <TabIcon name="trophy" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: t.nav.achievements,
          tabBarIcon: ({ color, focused }) => <TabIcon name="ribbon" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
