import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { buildProgressMap, fetchUserProgressData } from "@f1/shared/lib/achievement-calculator";
import { fetchAchievementsData } from "@f1/shared/lib/achievements";
import type { AchievementCategory } from "@f1/shared/types";

import { AchievementCard } from "@/components/achievements/AchievementCard";
import { AchievementsHeader } from "@/components/achievements/AchievementsHeader";
import { CategoryChips, type CategoryFilter } from "@/components/achievements/CategoryChips";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

const CATEGORIES: AchievementCategory[] = ["predictions", "accuracy", "milestones", "special"];

/**
 * Achievements screen (Phase 4b): ports the web achievements page — header
 * card with overall progress, category filter chips, and the earned/locked
 * achievement list with per-achievement progress bars on locked cards.
 */
export default function AchievementsScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id;

  // Same query key as the Home dashboard so both screens share the cache.
  const achievementsQuery = useQuery({
    queryKey: ["achievements", userId],
    queryFn: () => fetchAchievementsData(supabase, userId!),
    enabled: Boolean(userId),
  });

  const progressQuery = useQuery({
    queryKey: ["achievementProgress", userId],
    queryFn: () => fetchUserProgressData(supabase, userId!),
    enabled: Boolean(userId),
  });

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([achievementsQuery.refetch(), progressQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  const loadError = achievementsQuery.error ?? progressQuery.error;
  const isPending = Boolean(userId) && (achievementsQuery.isPending || progressQuery.isPending);

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text className="text-center text-sm text-f1-white/70">{t.predictionsPage.loadError}</Text>
        <Pressable
          onPress={() => {
            achievementsQuery.refetch();
            progressQuery.refetch();
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

  const data = achievementsQuery.data;
  const progress = progressQuery.data;

  if (isPending || !data || !progress) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator color="#CF2637" />
      </View>
    );
  }

  const { achievements, earnedIds } = data;
  const earnedSet = new Set(earnedIds);
  const progressMap = buildProgressMap(achievements, progress);

  const categoryLabels: Record<AchievementCategory, string> = {
    predictions: t.achievementsPage.categoryPredictions,
    accuracy: t.achievementsPage.categoryAccuracy,
    milestones: t.achievementsPage.categoryMilestones,
    special: t.achievementsPage.categorySpecial,
  };

  const chipItems = [
    { value: "all" as const, label: t.achievementsPage.all, count: achievements.length },
    ...CATEGORIES.map((cat) => ({
      value: cat,
      label: categoryLabels[cat],
      count: achievements.filter((a) => a.category === cat).length,
    })),
  ];

  const filtered =
    activeCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 p-4"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#CF2637" />
      }
    >
      <AchievementsHeader earnedCount={earnedIds.length} totalCount={achievements.length} />

      <CategoryChips items={chipItems} active={activeCategory} onSelect={setActiveCategory} />

      {filtered.length > 0 ? (
        <View className="overflow-hidden rounded-2xl border border-f1-white/10 bg-f1-white/5">
          {filtered.map((achievement, index) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              isEarned={earnedSet.has(achievement.id)}
              categoryLabel={categoryLabels[achievement.category]}
              progress={earnedSet.has(achievement.id) ? undefined : progressMap[achievement.id]}
              isLast={index === filtered.length - 1}
            />
          ))}
        </View>
      ) : (
        <View className="items-center gap-2 rounded-2xl border border-f1-white/10 bg-f1-white/5 py-12">
          <Ionicons name="ribbon" size={24} color="#F7F7F74D" />
          <Text className="text-sm text-f1-white/50">{t.achievementsPage.noAchievements}</Text>
        </View>
      )}
    </ScrollView>
  );
}
