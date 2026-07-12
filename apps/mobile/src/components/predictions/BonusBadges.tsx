import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";

export interface BonusBadge {
  label: string;
  points: number;
  tone: "green" | "amber";
}

/**
 * Row of bonus pills (perfect/match podium, top 10/8, qualifying) shown under
 * a scored prediction form — mirrors the web BonusBadges component.
 */
export function BonusBadges({ badges }: { badges: BonusBadge[] }) {
  const { t } = useLanguage();
  if (badges.length === 0) return null;
  return (
    <View className="gap-2 border-t border-f1-white/10 pt-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/60">
        {t.predictionsPage.bonuses}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {badges.map((b) => {
          const tone =
            b.tone === "green"
              ? { box: "border-f1-green/30 bg-f1-green/10", text: "text-f1-green", icon: "#44AF69" }
              : { box: "border-f1-amber/30 bg-f1-amber/10", text: "text-f1-amber", icon: "#FFB100" };
          return (
            <View
              key={b.label}
              accessible
              accessibilityLabel={`${b.label} +${b.points}`}
              className={`flex-row items-center gap-1 rounded-full border px-2 py-1 ${tone.box}`}
            >
              <Ionicons name="trophy" size={10} color={tone.icon} />
              <Text className={`text-[10px] font-semibold ${tone.text}`}>{b.label}</Text>
              <Text className={`text-[10px] font-bold tabular-nums ${tone.text}`}>
                +{b.points}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
