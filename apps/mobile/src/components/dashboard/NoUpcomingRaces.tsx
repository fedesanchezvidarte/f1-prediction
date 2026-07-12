import { Text, View } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";

/** Ports the web NoUpcomingRaces: shown in place of the countdown after the season ends. */
export function NoUpcomingRaces() {
  const { t } = useLanguage();
  return (
    <View className="items-center justify-center rounded-2xl border border-f1-white/10 bg-f1-white/5 p-6">
      <Text className="text-sm text-f1-white/50">{t.nextRace.noUpcoming}</Text>
    </View>
  );
}
