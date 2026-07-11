import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { TeamWithDrivers } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";

interface TeamPickerModalProps {
  visible: boolean;
  /** Slot label shown in the sheet header (e.g. the WCC label). */
  label: string;
  teams: TeamWithDrivers[];
  /** Currently selected team name, if any. */
  value: string | null;
  onSelect: (teamName: string) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet team picker for the WCC champion prediction: one tappable row
 * per team with its color bar — same styling as the DriverPickerModal.
 */
export function TeamPickerModal({
  visible,
  label,
  teams,
  value,
  onSelect,
  onClose,
}: TeamPickerModalProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

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
          className="max-h-[75%] rounded-t-3xl border-t border-f1-white/10 bg-f1-black"
          style={{ paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-center justify-between border-b border-f1-white/10 px-5 py-4">
            <Text className="flex-1 text-sm font-bold uppercase tracking-wider text-f1-white" numberOfLines={1}>
              {label}
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
            data={teams}
            keyExtractor={(team) => String(team.id)}
            renderItem={({ item: team }) => {
              const selected = value === team.name;
              return (
                <Pressable
                  onPress={() => onSelect(team.name)}
                  accessibilityRole="button"
                  accessibilityLabel={team.name}
                  accessibilityState={{ selected }}
                  className={`min-h-14 flex-row items-center gap-3 px-5 py-2.5 ${
                    selected ? "bg-f1-red/10" : "active:bg-f1-white/10"
                  }`}
                >
                  <View
                    className="h-9 w-1.5 rounded-full"
                    style={{ backgroundColor: `#${team.color}` }}
                  />
                  <Text className="flex-1 text-sm font-semibold text-f1-white" numberOfLines={1}>
                    {team.name}
                  </Text>
                  {selected ? <Ionicons name="checkmark" size={16} color="#CF2637" /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
