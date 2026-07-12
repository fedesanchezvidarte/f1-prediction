import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Header card for the Achievements screen: title, "X of Y unlocked" counter
 * and the purple overall progress bar (ports the web AchievementsContent
 * header).
 */
export function AchievementsHeader({
  earnedCount,
  totalCount,
}: {
  earnedCount: number;
  totalCount: number;
}) {
  const { t } = useLanguage();
  const percent = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  return (
    <View className="overflow-hidden rounded-2xl border border-f1-white/10 bg-f1-white/5">
      <View className="flex-row items-center gap-3 border-b border-f1-white/10 px-5 py-4">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-f1-purple/10">
          <Ionicons name="ribbon" size={18} color="#A06CD5" />
        </View>
        <View>
          <Text className="text-sm font-semibold text-f1-white">{t.achievementsPage.title}</Text>
          <Text className="text-[11px] text-f1-white/50">
            {earnedCount} {t.achievementsPage.of} {totalCount} {t.achievementsPage.unlocked}
          </Text>
        </View>
      </View>

      <View className="px-5 py-3">
        <View
          className="h-1.5 w-full overflow-hidden rounded-full bg-f1-white/10"
          accessibilityRole="progressbar"
          accessibilityLabel={`${earnedCount} ${t.achievementsPage.of} ${totalCount} ${t.achievementsPage.unlocked}`}
          accessibilityValue={{ min: 0, max: totalCount, now: earnedCount }}
        >
          <View className="h-full rounded-full bg-f1-purple" style={{ width: `${percent}%` }} />
        </View>
      </View>
    </View>
  );
}
