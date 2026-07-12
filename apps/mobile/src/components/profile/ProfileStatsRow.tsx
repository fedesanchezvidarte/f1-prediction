import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { ProfileStats } from "@f1/shared/lib/profile";

import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Four-cell stats strip from the web profile card: points (amber trophy),
 * rank (purple medal), predictions (green star), achievements (blue ribbon).
 */
export function ProfileStatsRow({ stats }: { stats: ProfileStats }) {
  const { t } = useLanguage();

  return (
    <View className="flex-row border-b border-f1-white/10">
      <StatCell icon="trophy" color="#FFB100" label={t.profilePage.points} value={String(stats.totalPoints)} />
      <StatCell
        icon="medal"
        color="#A06CD5"
        label={t.profilePage.rank}
        value={stats.rank ? `#${stats.rank}` : "—"}
        divider
      />
      <StatCell
        icon="star"
        color="#44AF69"
        label={t.profilePage.predictions}
        value={String(stats.predictionsCount)}
        divider
      />
      <StatCell
        icon="ribbon"
        color="#3C91E6"
        label={t.profilePage.achievements}
        value={String(stats.achievementsCount)}
        divider
      />
    </View>
  );
}

function StatCell({
  icon,
  color,
  label,
  value,
  divider = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      className={`flex-1 items-center gap-1 px-2 py-4 ${divider ? "border-l border-f1-white/10" : ""}`}
    >
      <Ionicons name={icon} size={15} color={color} />
      <Text className="text-base font-bold tabular-nums text-f1-white">{value}</Text>
      <Text className="text-[10px] text-f1-white/50" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
