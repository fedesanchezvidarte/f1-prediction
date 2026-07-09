import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { fetchRaces } from "@f1/shared/lib/races";
import { getNextRace } from "@f1/shared/lib/race-utils";

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Phase 1 smoke screen — proves every scaffold pillar in one place:
 * NativeWind + F1 palette, shared translations via useLanguage, shared
 * pure + service functions, and TanStack Query over the Supabase client.
 * Replaced by the real screens from Phase 3 onward.
 */
export default function SmokeScreen() {
  const { t, language, setLanguage } = useLanguage();

  const { data: races, isPending, error, refetch } = useQuery({
    queryKey: ["races"],
    queryFn: () => fetchRaces(supabase),
  });

  const nextRace = races ? getNextRace(races) : null;

  return (
    <ScrollView className="flex-1 bg-f1-black" contentContainerClassName="p-6 gap-6">
      <View className="gap-1">
        <Text className="text-3xl font-bold text-f1-white">F1 Prediction</Text>
        <Text className="text-f1-red font-semibold">{t.navbar.season}</Text>
      </View>

      <View className="rounded-2xl bg-f1-white/5 border border-f1-white/10 p-4 gap-2">
        <Text className="text-f1-amber font-semibold">Supabase + TanStack Query</Text>
        {isPending ? (
          <ActivityIndicator color="#CF2637" />
        ) : error ? (
          <Text className="text-f1-red">{String(error)}</Text>
        ) : (
          <>
            <Text className="text-f1-white">
              {races?.length ?? 0} races loaded from the live database
            </Text>
            {nextRace ? (
              <Text className="text-f1-blue">Next: {nextRace.raceName}</Text>
            ) : null}
          </>
        )}
        <Pressable
          onPress={() => refetch()}
          className="mt-2 self-start rounded-lg bg-f1-red px-4 py-2 active:bg-f1-red-hover"
        >
          <Text className="font-semibold text-white">Refetch</Text>
        </Pressable>
      </View>

      <View className="rounded-2xl bg-f1-white/5 border border-f1-white/10 p-4 gap-2">
        <Text className="text-f1-green font-semibold">i18n ({language})</Text>
        <Text className="text-f1-white">{t.nav.leaderboard}</Text>
        <Pressable
          onPress={() => setLanguage(language === "en" ? "es" : "en")}
          className="mt-2 self-start rounded-lg bg-f1-purple px-4 py-2"
        >
          <Text className="font-semibold text-white">
            {language === "en" ? "Español" : "English"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
