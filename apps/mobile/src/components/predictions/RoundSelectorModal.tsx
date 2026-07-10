import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { countryCodeToFlag, getRaceStatus } from "@f1/shared/lib/race-utils";
import type { Race } from "@f1/shared/types";

import { RaceStatusBadge } from "@/components/predictions/StatusBadges";
import { useLanguage } from "@/providers/LanguageProvider";

interface RoundSelectorModalProps {
  visible: boolean;
  races: Race[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet listing every round of the season. The currently selected
 * round is highlighted; each row shows the flag, round number, race name
 * and its live/upcoming/completed status badge.
 */
export function RoundSelectorModal({
  visible,
  races,
  selectedIndex,
  onSelect,
  onClose,
}: RoundSelectorModalProps) {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      month: "short",
      day: "numeric",
    });

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
          className="max-h-[80%] rounded-t-3xl border-t border-f1-white/10 bg-f1-black"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-center justify-between border-b border-f1-white/10 px-5 py-4">
            <Text className="text-sm font-bold uppercase tracking-wider text-f1-white">
              {t.predictionsPage.jumpToRound}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t.predictionsPage.dismiss}
              className="h-8 w-8 items-center justify-center rounded-full bg-f1-white/10 active:bg-f1-white/20"
            >
              <Ionicons name="close" size={16} color="#F7F7F7" />
            </Pressable>
          </View>

          <FlatList
            data={races}
            keyExtractor={(race) => String(race.meetingKey)}
            renderItem={({ item: race, index }) => {
              const isSelected = index === selectedIndex;
              return (
                <Pressable
                  onPress={() => onSelect(index)}
                  accessibilityRole="button"
                  accessibilityLabel={`R${race.round} ${race.raceName}`}
                  accessibilityState={{ selected: isSelected }}
                  className={`min-h-14 flex-row items-center gap-3 border-l-2 px-5 py-2.5 ${
                    isSelected ? "border-f1-red bg-f1-red/10" : "border-transparent active:bg-f1-white/10"
                  }`}
                >
                  <Text className="text-lg">{countryCodeToFlag(race.countryCode)}</Text>
                  <Text className="w-9 text-xs font-bold tabular-nums text-f1-white/50">
                    R{String(race.round).padStart(2, "0")}
                  </Text>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-semibold ${isSelected ? "text-f1-red" : "text-f1-white"}`}
                      numberOfLines={1}
                    >
                      {race.raceName}
                    </Text>
                    <Text className="text-xs text-f1-white/50">
                      {formatDate(race.dateStart)} – {formatDate(race.dateEnd)}
                    </Text>
                  </View>
                  <RaceStatusBadge status={getRaceStatus(race)} />
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
