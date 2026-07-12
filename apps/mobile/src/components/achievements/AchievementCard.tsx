import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import type { Achievement } from "@f1/shared/types";

import { getAchievementIconName } from "@/lib/achievement-icons";
import { getCategoryStyle } from "@/lib/achievement-styles";

/**
 * Single achievement row (ports the web bento cell): earned cards show the
 * colored category icon plus a green check; locked cards show a lock icon at
 * 60% opacity with muted text and, when progress data exists, a per-
 * achievement progress bar with "current / max".
 */
export function AchievementCard({
  achievement,
  isEarned,
  categoryLabel,
  progress,
  isLast = false,
}: {
  achievement: Achievement;
  isEarned: boolean;
  categoryLabel: string;
  progress?: { current: number; max: number };
  /** Skips the bottom divider on the list's last row. */
  isLast?: boolean;
}) {
  const style = getCategoryStyle(achievement.category);
  const fill = progress ? Math.min(progress.current / progress.max, 1) * 100 : 0;

  return (
    <View
      className={`flex-row items-start gap-3 p-4 ${isLast ? "" : "border-b border-f1-white/10"} ${
        isEarned ? "" : "opacity-60"
      }`}
    >
      {/* Icon */}
      <View
        className={`h-11 w-11 items-center justify-center rounded-xl ${
          isEarned ? style.bgClass : "bg-f1-white/10"
        }`}
      >
        {isEarned ? (
          <Ionicons name={getAchievementIconName(achievement.slug)} size={18} color={style.hex} />
        ) : (
          <Ionicons name="lock-closed" size={16} color="#F7F7F766" />
        )}
      </View>

      {/* Text */}
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text
            className={`text-xs font-semibold ${isEarned ? "text-f1-white" : "text-f1-white/50"}`}
          >
            {achievement.name}
          </Text>
          {isEarned ? (
            <View className="h-4 w-4 items-center justify-center rounded-full bg-f1-green/20">
              <Ionicons name="checkmark" size={10} color="#44AF69" />
            </View>
          ) : null}
        </View>
        <Text className="mt-0.5 text-[10px] leading-4 text-f1-white/50">
          {achievement.description}
        </Text>
        <View className="mt-1.5 flex-row">
          <View className={`rounded-md px-1.5 py-0.5 ${style.bgClass}`}>
            <Text className={`text-[9px] font-medium uppercase tracking-wider ${style.textClass}`}>
              {categoryLabel}
            </Text>
          </View>
        </View>

        {/* Progress bar — only on locked cards with known progress */}
        {!isEarned && progress ? (
          <View className="mt-2 gap-0.5">
            <View
              className="h-1 w-full overflow-hidden rounded-full bg-f1-white/10"
              accessibilityRole="progressbar"
              accessibilityLabel={`${achievement.name}: ${progress.current} / ${progress.max}`}
              accessibilityValue={{ min: 0, max: progress.max, now: progress.current }}
            >
              {/* Fill color comes from the category hex: a class built at
                  runtime (e.g. "bg-f1-blue") would not be compiled by
                  NativeWind since it never appears literally in source. */}
              <View
                className="h-full rounded-full"
                style={{ width: `${fill}%`, backgroundColor: style.hex }}
              />
            </View>
            <Text className={`text-right text-[9px] tabular-nums ${style.textClass}`}>
              {progress.current} / {progress.max}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
