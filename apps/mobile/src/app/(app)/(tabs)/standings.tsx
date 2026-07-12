import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { fetchChampionshipStandings } from "@f1/shared/lib/championship-standings";
import type { ConstructorStanding, DriverStanding, StatLeader } from "@f1/shared/types";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";

type StandingsTab = "wdc" | "wcc" | "stats";

const TABS: readonly StandingsTab[] = ["wdc", "wcc", "stats"] as const;

/** Column header shared by the WDC and WCC lists. */
function ListHeader({ nameLabel }: { nameLabel: string }) {
  const { t } = useLanguage();
  return (
    <View className="flex-row items-center gap-2 border-b border-f1-white/10 bg-f1-white/5 px-4 py-2">
      <Text className="w-8 text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
        {t.standingsModal.rank}
      </Text>
      <Text className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
        {nameLabel}
      </Text>
      <Text className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
        {t.standingsModal.wins}
      </Text>
      <Text className="w-10 text-right text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
        {t.standingsModal.podiums}
      </Text>
      <Text className="w-12 text-right text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
        {t.standingsModal.points}
      </Text>
    </View>
  );
}

/** One standings row: rank, team color bar, name (+ optional subtitle), stats. */
function StandingRow({
  rank,
  color,
  name,
  subtitle,
  wins,
  podiums,
  points,
}: {
  rank: number;
  color: string;
  name: string;
  subtitle?: string;
  wins: number;
  podiums: number;
  points: number;
}) {
  return (
    <View className="min-h-12 flex-row items-center gap-2 border-b border-f1-white/10 px-4 py-2.5">
      <Text className="w-8 text-xs font-bold tabular-nums text-f1-white">{rank}</Text>
      <View className="h-6 w-1 rounded-sm" style={{ backgroundColor: `#${color}` }} />
      <View className="flex-1">
        <Text className="text-xs font-medium text-f1-white" numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text className="text-[10px] text-f1-white/50" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text className="w-10 text-right text-xs tabular-nums text-f1-white/50">{wins}</Text>
      <Text className="w-10 text-right text-xs tabular-nums text-f1-white/50">{podiums}</Text>
      <Text className="w-12 text-right text-xs font-semibold tabular-nums text-f1-white">
        {points}
      </Text>
    </View>
  );
}

/** Single stat-leader card (most wins / podiums / DNFs). */
function StatRow({
  icon,
  label,
  leader,
}: {
  icon: React.ReactNode;
  label: string;
  leader: StatLeader | null;
}) {
  const { t } = useLanguage();

  return (
    <View className="flex-row items-center justify-between rounded-xl border border-f1-white/10 bg-f1-white/5 px-4 py-3">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-xs font-medium uppercase tracking-wider text-f1-white/50">
          {label}
        </Text>
      </View>
      {leader ? (
        <View className="flex-row items-center gap-3">
          <View className="items-end">
            <Text className="text-xs font-semibold text-f1-white">
              {leader.driver.firstName} {leader.driver.lastName}
            </Text>
            <Text className="text-[10px]" style={{ color: `#${leader.driver.teamColor}` }}>
              {leader.driver.teamName}
            </Text>
          </View>
          <View className="rounded-full bg-f1-red/10 px-2.5 py-0.5">
            <Text className="text-xs font-bold tabular-nums text-f1-red">{leader.count}</Text>
          </View>
        </View>
      ) : (
        <Text className="text-xs text-f1-white/50">{t.standingsModal.empty}</Text>
      )}
    </View>
  );
}

export default function StandingsScreen() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<StandingsTab>("wdc");
  const [refreshing, setRefreshing] = useState(false);

  const standingsQuery = useQuery({
    queryKey: ["championshipStandings"],
    queryFn: () => fetchChampionshipStandings(supabase),
  });
  const standings = standingsQuery.data;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await standingsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  if (standingsQuery.error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-f1-black p-6">
        <Text className="text-center text-sm text-f1-white/70">{t.predictionsPage.loadError}</Text>
        <Pressable
          onPress={() => standingsQuery.refetch()}
          accessibilityRole="button"
          accessibilityLabel={t.predictionsPage.retry}
          className="min-h-11 items-center justify-center rounded-lg bg-f1-red px-6 active:bg-f1-red-hover"
        >
          <Text className="font-semibold text-white">{t.predictionsPage.retry}</Text>
        </Pressable>
      </View>
    );
  }

  if (standingsQuery.isPending || !standings) {
    return (
      <View className="flex-1 items-center justify-center bg-f1-black p-6">
        <ActivityIndicator color="#CF2637" />
      </View>
    );
  }

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#CF2637" />
  );

  const isEmpty =
    activeTab === "wdc"
      ? standings.wdc.length === 0
      : activeTab === "wcc"
        ? standings.wcc.length === 0
        : !standings.stats.mostWins && !standings.stats.mostPodiums && !standings.stats.mostDnfs;

  return (
    <View className="flex-1 bg-f1-black">
      {/* ── Segmented tabs: Drivers / Constructors / Stats ── */}
      <View className="flex-row border-b border-f1-white/10">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityLabel={t.standingsModal.tabs[tab]}
              accessibilityState={{ selected: isActive }}
              className={`min-h-11 flex-1 items-center justify-center border-b-2 ${
                isActive ? "border-f1-red" : "border-transparent active:bg-f1-white/5"
              }`}
            >
              <Text
                className={`text-xs font-medium ${isActive ? "text-f1-white" : "text-f1-white/50"}`}
              >
                {t.standingsModal.tabs[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isEmpty ? (
        <ScrollView contentContainerClassName="flex-1 items-center justify-center p-6" refreshControl={refreshControl}>
          <Text className="text-center text-sm text-f1-white/50">{t.standingsModal.empty}</Text>
        </ScrollView>
      ) : activeTab === "wdc" ? (
        <FlatList
          data={standings.wdc}
          keyExtractor={(entry: DriverStanding) => String(entry.driverId)}
          ListHeaderComponent={<ListHeader nameLabel={t.standingsModal.driver} />}
          refreshControl={refreshControl}
          renderItem={({ item: entry }) => (
            <StandingRow
              rank={entry.rank}
              color={entry.driver.teamColor}
              name={`${entry.driver.firstName} ${entry.driver.lastName}`}
              subtitle={entry.driver.teamName}
              wins={entry.wins}
              podiums={entry.podiums}
              points={entry.points}
            />
          )}
        />
      ) : activeTab === "wcc" ? (
        <FlatList
          data={standings.wcc}
          keyExtractor={(entry: ConstructorStanding) => String(entry.teamId)}
          ListHeaderComponent={<ListHeader nameLabel={t.standingsModal.team} />}
          refreshControl={refreshControl}
          renderItem={({ item: entry }) => (
            <StandingRow
              rank={entry.rank}
              color={entry.teamColor}
              name={entry.teamName}
              wins={entry.wins}
              podiums={entry.podiums}
              points={entry.points}
            />
          )}
        />
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4" refreshControl={refreshControl}>
          <StatRow
            icon={<Ionicons name="trophy" size={14} color="#FFB100" />}
            label={t.standingsModal.mostWins}
            leader={standings.stats.mostWins}
          />
          <StatRow
            icon={<Ionicons name="trending-up" size={14} color="#44AF69" />}
            label={t.standingsModal.mostPodiums}
            leader={standings.stats.mostPodiums}
          />
          <StatRow
            icon={<Ionicons name="warning" size={14} color="#CF2637" />}
            label={t.standingsModal.mostDnfs}
            leader={standings.stats.mostDnfs}
          />
        </ScrollView>
      )}
    </View>
  );
}
