import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme, type ThemePreference } from "@/providers/ThemeProvider";

const OPTIONS: { value: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "dark", icon: "moon" },
  { value: "light", icon: "sunny" },
  { value: "system", icon: "phone-portrait-outline" },
];

/**
 * Dark / Light / System segmented pill for the profile drawer — same visual
 * language as AuthLanguageSwitcher. Icon-only (the drawer row is narrow), so
 * each segment carries a translated accessibilityLabel.
 */
export function ThemeSwitcher() {
  const { t } = useLanguage();
  const { theme, setTheme, colors } = useTheme();

  const labels: Record<ThemePreference, string> = {
    dark: t.profilePage.themeDark,
    light: t.profilePage.themeLight,
    system: t.profilePage.themeSystem,
  };

  return (
    <View className="flex-row items-center gap-0.5 rounded-full border border-foreground/10 bg-foreground/5 p-0.5">
      {OPTIONS.map(({ value, icon }) => {
        const selected = theme === value;
        return (
          <Pressable
            key={value}
            onPress={() => setTheme(value)}
            accessibilityRole="button"
            accessibilityLabel={`${t.profilePage.theme}: ${labels[value]}`}
            accessibilityState={{ selected }}
            className={`rounded-full px-2.5 py-1.5 ${selected ? "bg-f1-red" : ""}`}
          >
            <Ionicons name={icon} size={13} color={selected ? "#ffffff" : colors.foregroundMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}
