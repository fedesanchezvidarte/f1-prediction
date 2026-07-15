import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import type { ChampionshipStandings } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { RankBadge } from "./RankBadge";

/**
 * Ports the web StandingsCard: compact WDC top-5 summary. Pressing the card
 * navigates to the Standings tab (the web opens a modal; mobile already has a
 * full Standings screen, so we reuse it and share its query cache).
 */
export function StandingsCard({ standings }: { standings: ChampionshipStandings }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();

  const topFive = standings.wdc.slice(0, 5);
  const hasData = topFive.length > 0;

  return (
    <Pressable
      onPress={() => router.navigate("/standings")}
      accessibilityRole="button"
      accessibilityLabel={`${t.standingsCard.title} — ${t.standingsCard.viewAll}`}
      className="rounded-2xl border border-f1-white/10 bg-f1-white/5 p-5 active:bg-f1-white/10"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ionicons name="trophy" size={16} color={colors.amber} />
          <Text className="text-xs font-medium uppercase tracking-wider text-f1-white/60">
            {t.standingsCard.title}
          </Text>
        </View>
        <View className="flex-row items-center gap-0.5">
          <Text className="text-xs font-medium text-f1-white/60">{t.standingsCard.viewAll}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.foregroundMuted} />
        </View>
      </View>

      {hasData ? (
        <View className="mt-3 gap-0.5">
          {topFive.map((entry) => (
            <View
              key={entry.driverId}
              className="flex-row items-center justify-between rounded-md px-2 py-2"
            >
              <View className="flex-1 flex-row items-center gap-2">
                <RankBadge rank={entry.rank} />
                <View
                  className="h-7 w-1 rounded-sm"
                  style={{ backgroundColor: `#${entry.driver.teamColor}` }}
                />
                <View className="flex-1">
                  <Text className="text-sm font-medium text-f1-white" numberOfLines={1}>
                    {entry.driver.firstName.charAt(0)}. {entry.driver.lastName}
                  </Text>
                  <Text className="text-xs text-f1-white/60" numberOfLines={1}>
                    {entry.driver.teamName}
                  </Text>
                </View>
              </View>
              <Text className="ml-2 text-sm font-semibold tabular-nums text-f1-white">
                {entry.points}
                <Text className="text-xs font-normal text-f1-white/60">
                  {" "}
                  {t.standingsCard.pts}
                </Text>
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="mt-3 items-center justify-center rounded-lg border border-dashed border-f1-white/10 p-4">
          <Text className="text-center text-xs text-f1-white/60">{t.standingsCard.noData}</Text>
        </View>
      )}
    </Pressable>
  );
}
