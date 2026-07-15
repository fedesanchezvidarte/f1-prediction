import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { fetchAchievementsData } from "@f1/shared/lib/achievements";
import { fetchChampionshipStandings } from "@f1/shared/lib/championship-standings";
import { fetchDashboardData } from "@f1/shared/lib/dashboard";
import { fetchRaces } from "@f1/shared/lib/races";

import { LeaderboardCard } from "@/components/dashboard/LeaderboardCard";
import { NextRaceCountdown } from "@/components/dashboard/NextRaceCountdown";
import { NoUpcomingRaces } from "@/components/dashboard/NoUpcomingRaces";
import { PointSystemCard } from "@/components/dashboard/PointSystemCard";
import { RaceCalendarCard } from "@/components/dashboard/RaceCalendarCard";
import { StandingsCard } from "@/components/dashboard/StandingsCard";
import { UserSummaryCard } from "@/components/dashboard/UserSummaryCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

/**
 * Home dashboard (Phase 4a): ports the web dashboard cards — user summary,
 * next-race countdown, championship standings, leaderboard top 10, point
 * system and race calendar. Sign-out lives in the Profile modal (Phase 4c).
 */
export default function HomeScreen() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id;

  const racesQuery = useQuery({
    queryKey: ["races"],
    queryFn: () => fetchRaces(supabase),
  });
  const races = racesQuery.data;

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", userId],
    queryFn: () => fetchDashboardData(supabase, userId!, races!),
    enabled: Boolean(userId && races),
  });

  const achievementsQuery = useQuery({
    queryKey: ["achievements", userId],
    queryFn: () => fetchAchievementsData(supabase, userId!),
    enabled: Boolean(userId),
  });

  // Same query key as the Standings tab so both screens share the cache.
  const standingsQuery = useQuery({
    queryKey: ["championshipStandings"],
    queryFn: () => fetchChampionshipStandings(supabase),
  });

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        racesQuery.refetch(),
        dashboardQuery.refetch(),
        achievementsQuery.refetch(),
        standingsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const loadError =
    racesQuery.error ?? dashboardQuery.error ?? achievementsQuery.error ?? standingsQuery.error;
  const isPending =
    racesQuery.isPending ||
    (Boolean(userId && races) && dashboardQuery.isPending) ||
    (Boolean(userId) && achievementsQuery.isPending) ||
    standingsQuery.isPending;

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-base text-f1-white/70">{t.predictionsPage.loadError}</Text>
        <Pressable
          onPress={() => {
            racesQuery.refetch();
            dashboardQuery.refetch();
            achievementsQuery.refetch();
            standingsQuery.refetch();
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

  const dashboard = dashboardQuery.data;
  const achievements = achievementsQuery.data;
  const standings = standingsQuery.data;

  if (isPending || !dashboard || !achievements || !standings) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.red} />
      }
    >
      <UserSummaryCard
        stats={dashboard.userStats}
        earnedCount={achievements.earnedIds.length}
        totalAchievements={achievements.achievements.length}
      />

      {dashboard.nextRace ? <NextRaceCountdown race={dashboard.nextRace} /> : <NoUpcomingRaces />}

      <StandingsCard standings={standings} />

      <LeaderboardCard entries={dashboard.leaderboard} currentUserId={userId} />

      <View className="flex-row gap-4">
        <PointSystemCard />
        <RaceCalendarCard entries={dashboard.calendarEntries} />
      </View>
    </ScrollView>
  );
}
