import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Driver } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";

interface DriverPickerModalProps {
  visible: boolean;
  /** Slot label shown in the sheet header, e.g. "Q1" or "Fastest Lap". */
  label: string;
  drivers: Driver[];
  value: Driver | null;
  /** Drivers that cannot be picked for this slot (already used elsewhere). */
  disabledDrivers: Driver[];
  /** Called with the picked driver, or null when clearing the selection. */
  onSelect: (driver: Driver | null) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet-style driver picker: dark card sliding up from the bottom
 * with one comfortably tappable row per driver (team color bar, number,
 * name, team). Disabled rows are greyed out with a translated reason.
 */
export function DriverPickerModal({
  visible,
  label,
  drivers,
  value,
  disabledDrivers,
  onSelect,
  onClose,
}: DriverPickerModalProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const isDisabled = (driver: Driver) =>
    disabledDrivers.some((d) => d.driverNumber === driver.driverNumber);

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
          className="max-h-[75%] rounded-t-3xl border-t border-f1-white/10 bg-card"
          style={{ paddingBottom: insets.bottom }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-f1-white/10 px-5 py-4">
            <Text className="text-sm font-bold uppercase tracking-wider text-f1-white">
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
            data={drivers}
            keyExtractor={(d) => String(d.driverNumber)}
            ListHeaderComponent={
              value ? (
                <Pressable
                  onPress={() => onSelect(null)}
                  accessibilityRole="button"
                  accessibilityLabel={t.predictionsPage.clearSelection}
                  className="min-h-12 flex-row items-center gap-3 border-b border-f1-white/10 px-5 py-3 active:bg-f1-white/10"
                >
                  <Ionicons name="close-circle-outline" size={20} color="#CF2637" />
                  <Text className="text-sm font-semibold text-f1-red">
                    {t.predictionsPage.clearSelection}
                  </Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item: driver }) => {
              const unavailable = isDisabled(driver);
              const selected = value?.driverNumber === driver.driverNumber;
              return (
                <Pressable
                  onPress={() => !unavailable && onSelect(driver)}
                  disabled={unavailable}
                  accessibilityRole="button"
                  accessibilityLabel={`${driver.firstName} ${driver.lastName}, ${driver.teamName}${
                    unavailable ? `, ${t.predictionsPage.alreadySelected}` : ""
                  }`}
                  accessibilityState={{ disabled: unavailable, selected }}
                  className={`min-h-14 flex-row items-center gap-3 px-5 py-2.5 ${
                    selected ? "bg-f1-red/10" : unavailable ? "opacity-35" : "active:bg-f1-white/10"
                  }`}
                >
                  <View
                    className="h-9 w-1.5 rounded-full"
                    style={{ backgroundColor: `#${driver.teamColor}` }}
                  />
                  <Text className="w-8 text-center text-sm font-bold tabular-nums text-f1-white/50">
                    {driver.driverNumber}
                  </Text>
                  {driver.headshotUrl ? (
                    <Image
                      source={{ uri: driver.headshotUrl }}
                      contentFit="cover"
                      className="h-9 w-9 rounded-full bg-f1-white/10"
                    />
                  ) : null}
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-f1-white" numberOfLines={1}>
                      {driver.firstName} {driver.lastName}
                    </Text>
                    <Text className="text-xs text-f1-white/50" numberOfLines={1}>
                      {driver.teamName}
                    </Text>
                  </View>
                  {unavailable ? (
                    <Text className="text-[10px] font-medium text-f1-white/40">
                      {t.predictionsPage.alreadySelected}
                    </Text>
                  ) : selected ? (
                    <Ionicons name="checkmark" size={16} color="#CF2637" />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
