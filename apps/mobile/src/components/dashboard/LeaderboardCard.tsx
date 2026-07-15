import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import type { LeaderboardEntry } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { RankBadge } from "./RankBadge";

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

/**
 * Ports the web LeaderboardCard: compact top-10 summary with a "you"
 * highlight. Pressing the card navigates to the Leaderboard tab.
 */
export function LeaderboardCard({ entries, currentUserId }: LeaderboardCardProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.navigate("/leaderboard")}
      accessibilityRole="button"
      accessibilityLabel={`${t.leaderboardCard.leaderboard} — ${t.leaderboardCard.viewAll}`}
      className="rounded-2xl border border-f1-white/10 bg-f1-white/5 p-5 active:bg-f1-white/10"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <Ionicons name="medal" size={16} color={colors.amber} />
          <Text className="text-xs font-medium uppercase tracking-wider text-f1-white/60">
            {t.leaderboardCard.leaderboard}
          </Text>
          <View className="rounded bg-f1-amber/15 px-1.5 py-0.5">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-f1-amber">
              Top 10
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-xs font-medium text-f1-white/60">{t.leaderboardCard.viewAll}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.foregroundMuted} />
        </View>
      </View>

      <View className="mt-3 gap-0.5">
        {entries.map((entry) => {
          const isMe = entry.userId === currentUserId;
          return (
            <View
              key={entry.userId}
              className={`flex-row items-center justify-between rounded-md px-2 py-2 ${
                isMe ? "bg-f1-red/10" : ""
              }`}
            >
              <View className="flex-1 flex-row items-center gap-2">
                <RankBadge rank={entry.rank} />
                <Text
                  className={`flex-1 text-sm font-medium ${
                    isMe ? "text-f1-white" : "text-f1-white/70"
                  }`}
                  numberOfLines={1}
                >
                  {entry.displayName}
                  {isMe ? (
                    <Text className="text-xs text-f1-red"> ({t.leaderboardCard.you})</Text>
                  ) : null}
                </Text>
              </View>
              <Text className="ml-2 text-sm font-semibold tabular-nums text-f1-white">
                {entry.totalPoints}
                <Text className="text-xs font-normal text-f1-white/60">
                  {" "}
                  {t.leaderboardCard.pts}
                </Text>
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}
