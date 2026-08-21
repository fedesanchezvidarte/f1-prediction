import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Driver } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

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
 * name, team).
 *
 * Two distinct unselectable states, deliberately styled differently so they
 * can't be confused: a driver already used in another slot fades out in grey,
 * while a driver benched for this race weekend keeps full contrast and gets an
 * amber "out this race" badge plus a struck-through name. Both state the reason
 * in text and in their accessible name, never by colour alone.
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
  // Icon tints need a literal color; `colors.amber` is the same token as
  // `text-f1-amber` and darkens in the light theme, so the badge stays legible.
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isAlreadyPicked = (driver: Driver) =>
    disabledDrivers.some((d) => d.driverNumber === driver.driverNumber);

  /**
   * Benched for the round being viewed — flagged by `applyLineupOverrides` on
   * the driver list the screen hands us, so no call site has to add benched
   * drivers to `disabledDrivers` for every slot.
   */
  const isBenched = (driver: Driver) => driver.isUnavailable === true;

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
              const benched = isBenched(driver);
              const alreadyPicked = isAlreadyPicked(driver);
              // Benched wins the styling: it is the stronger reason, and the
              // driver is unpickable for this whole round rather than this slot.
              const disabled = benched || alreadyPicked;
              const selected = value?.driverNumber === driver.driverNumber;
              const reason = benched
                ? t.predictionsPage.driverOutThisRaceAria
                : alreadyPicked
                  ? t.predictionsPage.alreadySelected
                  : null;
              return (
                <Pressable
                  onPress={() => !disabled && onSelect(driver)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${driver.firstName} ${driver.lastName}, ${driver.teamName}${
                    reason ? `, ${reason}` : ""
                  }`}
                  accessibilityState={{ disabled, selected }}
                  className={`min-h-14 flex-row items-center gap-3 px-5 py-2.5 ${
                    selected
                      ? "bg-f1-red/10"
                      : benched
                        ? "border-l-2 border-f1-amber/50 bg-f1-amber/10 pl-[18px]"
                        : alreadyPicked
                          ? "opacity-35"
                          : "active:bg-f1-white/10"
                  }`}
                >
                  <View
                    className="h-9 w-1.5 rounded-full"
                    style={{ backgroundColor: `#${driver.teamColor}`, opacity: benched ? 0.4 : 1 }}
                  />
                  <Text className="w-8 text-center text-sm font-bold tabular-nums text-f1-white/50">
                    {driver.driverNumber}
                  </Text>
                  {driver.headshotUrl ? (
                    <Image
                      source={{ uri: driver.headshotUrl }}
                      contentFit="cover"
                      className={`h-9 w-9 rounded-full bg-f1-white/10 ${benched ? "opacity-50" : ""}`}
                    />
                  ) : null}
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-semibold ${
                        benched ? "text-f1-white/60 line-through" : "text-f1-white"
                      }`}
                      numberOfLines={1}
                    >
                      {driver.firstName} {driver.lastName}
                    </Text>
                    <Text className="text-xs text-f1-white/50" numberOfLines={1}>
                      {driver.teamName}
                    </Text>
                  </View>
                  {benched ? (
                    <View className="flex-row items-center gap-1 rounded-full border border-f1-amber/40 bg-f1-amber/15 px-2 py-0.5">
                      <Ionicons name="remove-circle-outline" size={11} color={colors.amber} />
                      <Text className="text-[9px] font-bold uppercase tracking-wide text-f1-amber">
                        {t.predictionsPage.driverOutThisRace}
                      </Text>
                    </View>
                  ) : alreadyPicked ? (
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
