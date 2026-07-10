import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { fetchRaces } from "@f1/shared/lib/races";
import { getNextRace } from "@f1/shared/lib/race-utils";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Phase 1 smoke screen, now behind auth — proves every scaffold pillar in
 * one place: NativeWind + F1 palette, shared translations via useLanguage,
 * shared pure + service functions, TanStack Query over the Supabase client,
 * and (Phase 2) the signed-in session + sign out.
 * Replaced by the real screens from Phase 3 onward.
 */
export default function HomeScreen() {
  const { t, language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const { data: races, isPending, error, refetch } = useQuery({
    queryKey: ["races"],
    queryFn: () => fetchRaces(supabase),
  });

  const nextRace = races ? getNextRace(races) : null;

  async function handleSignOut() {
    setSigningOut(true);
    // On success onAuthStateChange clears the session and Stack.Protected
    // swaps back to the (auth) group — no manual navigation needed.
    await signOut().catch(() => setSigningOut(false));
  }

  return (
    <ScrollView className="flex-1 bg-f1-black" contentContainerClassName="p-6 gap-6">
      <View className="gap-1">
        <Text className="text-3xl font-bold text-f1-white">F1 Prediction</Text>
        <Text className="text-f1-red font-semibold">{t.navbar.season}</Text>
      </View>

      <View className="rounded-2xl bg-f1-white/5 border border-f1-white/10 p-4 gap-2">
        <Text className="text-f1-purple font-semibold">{t.navbar.signedInAs}</Text>
        <Text className="text-f1-white">{user?.email}</Text>
        <Pressable
          onPress={handleSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          className={`mt-2 self-start rounded-lg border border-f1-white/10 bg-f1-white/5 px-4 py-2 active:bg-f1-white/10 ${
            signingOut ? "opacity-50" : ""
          }`}
        >
          <Text className="font-semibold text-f1-white">
            {signingOut ? t.navbar.signingOut : t.navbar.signOut}
          </Text>
        </Pressable>
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
