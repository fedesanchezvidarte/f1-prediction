import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

interface AccountRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Danger rows (delete account) render in Crimson. */
  tone?: "default" | "danger";
  /** Trailing chevron for rows that open a sub-flow. */
  chevron?: boolean;
  /** Skips the bottom hairline on the card's last row. */
  last?: boolean;
}

/** Tappable settings row in the Account section of the profile card. */
export function AccountRow({
  icon,
  label,
  onPress,
  tone = "default",
  chevron = false,
  last = false,
}: AccountRowProps) {
  const { colors } = useTheme();
  const color = tone === "danger" ? "rgba(207,38,55,0.7)" : colors.foregroundMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`min-h-12 flex-row items-center gap-3 px-5 py-3.5 active:bg-f1-white/5 ${
        last ? "" : "border-b border-f1-white/10"
      }`}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text className={`flex-1 text-sm ${tone === "danger" ? "text-f1-red/70" : "text-f1-white"}`}>
        {label}
      </Text>
      {chevron ? (
        <Ionicons name="chevron-forward" size={15} color={colors.foregroundMuted} />
      ) : null}
    </Pressable>
  );
}
