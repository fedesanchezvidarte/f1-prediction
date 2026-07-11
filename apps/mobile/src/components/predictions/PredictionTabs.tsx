import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";

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
 * rounds; Champion accented amber like the web champion pill).
 */
export function PredictionTabs({
  tab,
  hasSprint,
  sprintNeedsAttention,
  champNeedsAttention,
  onChange,
}: PredictionTabsProps) {
  const { t } = useLanguage();

  const items: {
    key: PredictionTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    disabled: boolean;
    dot: boolean;
  }[] = [
    { key: "race", label: t.predictionsPage.race, icon: "flag", disabled: false, dot: false },
    {
      key: "sprint",
      label: t.predictionsPage.sprint,
      icon: "flash",
      disabled: !hasSprint,
      dot: hasSprint && sprintNeedsAttention,
    },
    {
      key: "champion",
      label: t.predictionsPage.champion,
      icon: "trophy",
      disabled: false,
      dot: champNeedsAttention,
    },
  ];

  return (
    <View className="flex-row rounded-xl border border-f1-white/10 bg-f1-white/5 p-1">
      {items.map((item) => {
        const active = tab === item.key;
        const isChampion = item.key === "champion";
        return (
          <Pressable
            key={item.key}
            onPress={() => !item.disabled && onChange(item.key)}
            disabled={item.disabled}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active, disabled: item.disabled }}
            className={`min-h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-2 ${
              active
                ? isChampion
                  ? "bg-f1-amber"
                  : "bg-f1-red"
                : item.disabled
                  ? "opacity-30"
                  : "active:bg-f1-white/10"
            }`}
          >
            <Ionicons
              name={item.icon}
              size={13}
              color={active ? (isChampion ? "#2A2B2A" : "#FFFFFF") : "#F7F7F799"}
            />
            <Text
              className={`text-xs font-semibold ${
                active ? (isChampion ? "text-black" : "text-white") : "text-f1-white/60"
              }`}
            >
              {item.label}
            </Text>
            {item.disabled && (
              <Text className="text-[9px] text-f1-white/40">{t.predictionsPage.na}</Text>
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
