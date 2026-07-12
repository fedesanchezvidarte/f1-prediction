import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { RaceCalendarEntry } from "@f1/shared/lib/race-utils";

import { useLanguage } from "@/providers/LanguageProvider";
import { RaceCalendarModal } from "./RaceCalendarModal";

/** Ports the web RaceCalendarCard: tap to open the season calendar bottom sheet. */
export function RaceCalendarCard({ entries }: { entries: RaceCalendarEntry[] }) {
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t.raceCalendar.title} — ${t.raceCalendar.tapToView}`}
        className="flex-1 items-center justify-center gap-3 rounded-2xl border border-f1-white/10 bg-f1-white/5 p-5 active:bg-f1-white/10"
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-f1-red/10">
          <Ionicons name="calendar-outline" size={20} color="#CF2637" />
        </View>
        <View>
          <Text className="text-center text-xs font-medium text-f1-white">
            {t.raceCalendar.title}
          </Text>
          <Text className="mt-0.5 text-center text-[10px] text-f1-white/50">
            {t.raceCalendar.tapToView}
          </Text>
        </View>
      </Pressable>

      <RaceCalendarModal
        visible={modalOpen}
        entries={entries}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
