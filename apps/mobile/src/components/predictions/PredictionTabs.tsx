import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

export type PredictionTab = "race" | "sprint" | "champion";

interface PredictionTabsProps {
  tab: PredictionTab;
  /** Whether the currently selected round has a sprint. */
  hasSprint: boolean;
  /** Pulses an amber dot on the Sprint tab while its deadline is open and it isn't scored. */
  sprintNeedsAttention: boolean;
  /** Shows an amber dot on the Champion tab while full-points submissions are open and it isn't scored. */
  champNeedsAttention: boolean;
  onChange: (tab: PredictionTab) => void;
}

/**
 * Segmented Race / Sprint / Champion control shown under the screen header,
 * mirroring the web's tab row (Sprint disabled with "N/A" on non-sprint
 * rounds). Each tab owns a palette color when selected: Race crimson, Sprint
 * lavender, Champion amber. Crimson takes white labels; the two bright fills
 * take `on-bright` (graphite in dark, white in light) — see
 * docs/palette-audit.md.
 */
export function PredictionTabs({
  tab,
  hasSprint,
  sprintNeedsAttention,
  champNeedsAttention,
  onChange,
}: PredictionTabsProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const items: {
    key: PredictionTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    disabled: boolean;
    dot: boolean;
    /** Fill + label classes for the selected state. */
    activeBg: string;
    activeText: string;
    /** Icon tint for the selected state. */
    activeIcon: string;
  }[] = [
    {
      key: "race",
      label: t.predictionsPage.race,
      icon: "flag",
      disabled: false,
      dot: false,
      activeBg: "bg-f1-red",
      activeText: "text-white",
      activeIcon: "#FFFFFF",
    },
    {
      key: "sprint",
      label: t.predictionsPage.sprint,
      icon: "flash",
      disabled: !hasSprint,
      dot: hasSprint && sprintNeedsAttention,
      activeBg: "bg-f1-purple",
      activeText: "text-on-bright",
      activeIcon: colors.onBright,
    },
    {
      key: "champion",
      label: t.predictionsPage.champion,
      icon: "trophy",
      disabled: false,
      dot: champNeedsAttention,
      activeBg: "bg-f1-amber",
      activeText: "text-on-bright",
      activeIcon: colors.onBright,
    },
  ];

  return (
    <View className="flex-row rounded-xl border border-f1-white/10 bg-f1-white/5 p-1">
      {items.map((item) => {
        const active = tab === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => !item.disabled && onChange(item.key)}
            disabled={item.disabled}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active, disabled: item.disabled }}
            // A disabled tab is dimmed through foreground-derived colors rather
            // than a flat gray, so it stays clearly "off" in both themes: the
            // label and "N/A" drop to 30% of the foreground, and the icon takes
            // half of the already-50% muted tint.
            className={`min-h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-2 ${
              active ? item.activeBg : !item.disabled ? "active:bg-f1-white/10" : ""
            }`}
          >
            <View className={item.disabled ? "opacity-50" : ""}>
              <Ionicons
                name={item.icon}
                size={13}
                color={active ? item.activeIcon : colors.foregroundMuted}
              />
            </View>
            <Text
              className={`text-xs font-semibold ${
                active ? item.activeText : item.disabled ? "text-f1-white/30" : "text-f1-white/60"
              }`}
            >
              {item.label}
            </Text>
            {item.disabled && (
              <Text className="text-[10px] font-semibold uppercase tracking-wide text-f1-white/30">
                {t.predictionsPage.na}
              </Text>
            )}
            {item.dot && !active && (
              <View className="h-1.5 w-1.5 rounded-full bg-f1-amber" accessible={false} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
