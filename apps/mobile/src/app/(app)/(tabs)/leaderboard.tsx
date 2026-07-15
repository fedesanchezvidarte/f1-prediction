import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchDetailedLeaderboard } from "@f1/shared/lib/leaderboard";
import { countryCodeToFlag } from "@f1/shared/lib/race-utils";
import { fetchRaces } from "@f1/shared/lib/races";
import type { DetailedLeaderboardEntry, Race } from "@f1/shared/types";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

type RaceFilter = number | "all";

/** Amber / silver / bronze badge for the top 3, plain number below. */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full bg-f1-amber/15">
        <Text className="text-xs font-bold text-f1-amber">1</Text>
      </View>
    );
  }
  if (rank === 2) {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full bg-gray-400/15">
        <Text className="text-xs font-bold text-gray-400">2</Text>
      </View>
    );
  }
  if (rank === 3) {
    return (
      <View className="h-7 w-7 items-center justify-center rounded-full bg-amber-700/15">
        <Text className="text-xs font-bold text-amber-700">3</Text>
      </View>
    );
  }
  return (
    <View className="h-7 w-7 items-center justify-center">
      <Text className="text-xs tabular-nums text-f1-white/50">{rank}</Text>
    </View>
  );
}

/** Bottom-sheet listing "All Races" + every round, mirroring RoundSelectorModal. */
function RaceFilterModal({
  visible,
  races,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  races: Race[];
  selected: RaceFilter;
  onSelect: (filter: RaceFilter) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  function renderRow(label: string, value: RaceFilter, flag?: string) {
    const isSelected = selected === value;
    return (
      <Pressable
        onPress={() => onSelect(value)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isSelected }}
        className={`min-h-12 flex-row items-center gap-3 border-l-2 px-5 py-2.5 ${
          isSelected ? "border-f1-red bg-f1-red/10" : "border-transparent active:bg-f1-white/10"
        }`}
      >
        {flag ? <Text className="text-lg">{flag}</Text> : null}
        <Text
          className={`flex-1 text-sm font-semibold ${isSelected ? "text-f1-red" : "text-f1-white"}`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t.predictionsPage.dismiss}
        />
        <View
          className="max-h-[80%] rounded-t-3xl border-t border-f1-white/10 bg-card"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-center justify-between border-b border-f1-white/10 px-5 py-4">
            <Text className="text-sm font-bold uppercase tracking-wider text-f1-white">
              {t.leaderboardPage.filterByRace}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t.predictionsPage.dismiss}
              className="h-8 w-8 items-center justify-center rounded-full bg-f1-white/10 active:bg-f1-white/20"
            >
              <Ionicons name="close" size={16} color={colors.foreground} />
            </Pressable>
          </View>

          <FlatList
            data={races}
            keyExtractor={(race) => String(race.meetingKey)}
            ListHeaderComponent={renderRow(t.leaderboardPage.allRaces, "all")}
            renderItem={({ item: race }) =>
              renderRow(
                `R${race.round} — ${race.circuitShortName}`,
                race.meetingKey,
                countryCodeToFlag(race.countryCode)
              )
            }
          />
        </View>
      </View>
    </Modal>
  );
}

export default function LeaderboardScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { user } = useAuth();

  const racesQuery = useQuery({
    queryKey: ["races"],
    queryFn: () => fetchRaces(supabase),
  });
  const races = racesQuery.data ?? [];

  const leaderboardQuery = useQuery({
    queryKey: ["detailedLeaderboard"],
    queryFn: () => fetchDetailedLeaderboard(supabase, racesQuery.data ?? []),
    enabled: races.length > 0,
  });

  const [selectedRace, setSelectedRace] = useState<RaceFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Per-race view: re-sort by that race's points and re-assign shared ranks
  // (mirrors the web LeaderboardContent sorting; "all" keeps service ranks).
  const ranked: DetailedLeaderboardEntry[] = useMemo(() => {
    const entries = leaderboardQuery.data ?? [];
    if (selectedRace === "all") return entries;

    const sorted = [...entries].sort((a, b) => {
      const aP = a.racePoints[selectedRace] ?? -1;
      const bP = b.racePoints[selectedRace] ?? -1;
      return bP - aP;
    });
    const result: DetailedLeaderboardEntry[] = [];
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      const pts = sorted[i].racePoints[selectedRace] ?? -1;
      const prevPts = i > 0 ? (sorted[i - 1].racePoints[selectedRace] ?? -1) : pts;
      if (i > 0 && pts < prevPts) currentRank = i + 1;
      result.push({ ...sorted[i], rank: currentRank });
    }
    return result;
  }, [leaderboardQuery.data, selectedRace]);

  const selectedRaceLabel =
    selectedRace === "all"
      ? t.leaderboardPage.allRaces
      : (races.find((r) => r.meetingKey === selectedRace)?.circuitShortName ?? "");

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([racesQuery.refetch(), leaderboardQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const loadError = racesQuery.error ?? leaderboardQuery.error;
  const isPending = racesQuery.isPending || (races.length > 0 && leaderboardQuery.isPending);

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-sm text-f1-white/70">{t.predictionsPage.loadError}</Text>
        <Pressable
          onPress={() => {
            racesQuery.refetch();
            leaderboardQuery.refetch();
          }}
          accessibilityRole="button"
          accessibilityLabel={t.predictionsPage.retry}
          className="min-h-11 items-center justify-center rounded-lg bg-f1-red px-6 active:bg-f1-red-hover"
        >
          <Text className="font-semibold text-white">{t.predictionsPage.retry}</Text>
        </Pressable>
      </View>
    );
  }

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* ── Toolbar: player count + race filter ── */}
      <View className="flex-row items-center justify-between border-b border-f1-white/10 px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Ionicons name="medal" size={16} color={colors.amber} />
          <Text className="text-sm font-semibold text-f1-white">{t.leaderboardPage.title}</Text>
          <View className="rounded-full bg-f1-white/10 px-2 py-0.5">
            <Text className="text-[10px] tabular-nums text-f1-white/50">
              {ranked.length} {t.leaderboardPage.players}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setFilterOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t.leaderboardPage.filterByRace}: ${selectedRaceLabel}`}
          className="min-h-9 flex-row items-center gap-1.5 rounded-lg border border-f1-white/10 px-3 active:bg-f1-white/10"
        >
          <Ionicons name="filter" size={13} color={colors.foregroundMuted} />
          <Text className="max-w-32 text-xs font-medium text-f1-white/70" numberOfLines={1}>
            {selectedRaceLabel}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.muted} />
        </Pressable>
      </View>

      {/* ── Column header ── */}
      <View className="flex-row items-center gap-3 border-b border-f1-white/10 bg-f1-white/5 px-4 py-2">
        <Text className="w-7 text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
          #
        </Text>
        <Text className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
          {t.leaderboardPage.player}
        </Text>
        <Text className="text-right text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
          {t.leaderboardPage.points}
        </Text>
      </View>

      {/* ── Ranked rows ── */}
      <FlatList
        data={ranked}
        keyExtractor={(entry) => entry.userId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.red} />
        }
        renderItem={({ item: entry }) => {
          const isMe = entry.userId === user?.id;
          const displayPoints =
            selectedRace === "all" ? entry.totalPoints : (entry.racePoints[selectedRace] ?? 0);
          return (
            <View
              className={`min-h-12 flex-row items-center gap-3 border-b border-f1-white/10 px-4 py-2.5 ${
                isMe ? "bg-f1-red/10" : ""
              }`}
            >
              <RankBadge rank={entry.rank} />
              <View className="flex-1 flex-row items-baseline gap-1.5">
                <Text
                  className={`text-sm font-medium ${isMe ? "text-f1-white" : "text-f1-white/80"}`}
                  numberOfLines={1}
                >
                  {entry.displayName}
                </Text>
                {isMe ? (
                  <Text className="text-[10px] text-f1-red">({t.leaderboardPage.you})</Text>
                ) : null}
              </View>
              <Text className="text-sm font-semibold tabular-nums text-f1-white">
                {displayPoints}
              </Text>
            </View>
          );
        }}
      />

      <RaceFilterModal
        visible={filterOpen}
        races={races}
        selected={selectedRace}
        onSelect={(filter) => {
          setSelectedRace(filter);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  );
}
