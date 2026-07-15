import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import type { UserStats } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

interface UserSummaryCardProps {
  stats: UserStats;
  /** Number of achievements the user has earned. */
  earnedCount: number;
  /** Total number of achievements available. */
  totalAchievements: number;
}

/**
 * Ports the web UserSummaryCard: total points + rank on the left,
 * achievements-earned progress on the right. The web per-slug lucide icon
 * previews are replaced by an amber progress bar (the icon map is web-only;
 * the full achievements screen ships in Phase 4c).
 */
export function UserSummaryCard({ stats, earnedCount, totalAchievements }: UserSummaryCardProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const progress = totalAchievements > 0 ? Math.min(earnedCount / totalAchievements, 1) : 0;

  return (
    <View className="flex-row gap-4 rounded-2xl border border-f1-white/10 bg-f1-white/5 p-5">
      {/* Left: points + rank */}
      <View className="flex-1 justify-between gap-4">
        <View>
          <Text className="text-xs font-medium uppercase tracking-wider text-f1-white/60">
            {t.userPoints.yourPoints}
          </Text>
          <Text className="mt-1 text-4xl font-bold tabular-nums text-f1-white">
            {stats.totalPoints}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Ionicons name="trending-up" size={16} color={colors.green} />
          <View>
            <Text className="text-xl font-semibold tabular-nums text-f1-white">
              {stats.rank}
              <Text className="text-sm text-f1-white/60">/{stats.totalUsers}</Text>
            </Text>
            <Text className="text-xs text-f1-white/60">{t.userPoints.rank}</Text>
          </View>
        </View>
      </View>

      {/* Right: achievements progress */}
      <View className="flex-1 justify-between gap-4">
        <View className="items-end">
          <Text className="text-right text-xs font-medium uppercase tracking-wider text-f1-white/60">
            {t.achievementsCard.achievements}
          </Text>
          <Text className="mt-1 text-2xl font-bold tabular-nums text-f1-white">
            {earnedCount}
            <Text className="text-sm font-normal text-f1-white/60">/{totalAchievements}</Text>
          </Text>
        </View>

        {earnedCount > 0 ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`${t.achievementsCard.achievements}: ${earnedCount}/${totalAchievements}`}
            className="h-1.5 overflow-hidden rounded-full bg-f1-white/10"
          >
            <View
              className="h-full rounded-full bg-f1-amber"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </View>
        ) : (
          <Text className="text-right text-xs text-f1-white/60">
            {t.achievementsCard.noAchievements}
          </Text>
        )}
      </View>
    </View>
  );
}
