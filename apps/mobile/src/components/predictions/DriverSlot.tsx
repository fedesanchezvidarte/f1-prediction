import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { Driver } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";

interface DriverSlotProps {
  /** Slot label, e.g. "Q1", "Race Winner (P1)", "Fastest Lap". */
  label: string;
  /** Optional numeric position rendered as a "P{n}" prefix (rest of top 10). */
  position?: number;
  value: Driver | null;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * A single tappable prediction slot. Tapping opens the DriverPickerModal;
 * this component only renders the current selection.
 */
export function DriverSlot({ label, position, value, disabled = false, onPress }: DriverSlotProps) {
  const { t } = useLanguage();
  const placeholder = t.predictionsPage.selectDriverPlaceholder;
  const valueLabel = value ? `${value.firstName} ${value.lastName}` : placeholder;
  const fullLabel = position !== undefined ? `P${position} ${label}`.trim() : label;

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-1">
        {position !== undefined && (
          <Text className="text-[10px] font-semibold tabular-nums text-f1-white/40">
            P{position}
          </Text>
        )}
        {label.length > 0 && (
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/60">
            {label}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${fullLabel}: ${valueLabel}`}
        accessibilityState={{ disabled }}
        className={`min-h-12 flex-row items-center gap-2 rounded-xl border px-3 py-2.5 ${
          disabled
            ? "border-f1-white/5 bg-f1-white/5 opacity-60"
            : "border-f1-white/10 bg-f1-white/5 active:bg-f1-white/10"
        }`}
      >
        {value ? (
          <>
            <View
              className="h-6 w-1.5 rounded-full"
              style={{ backgroundColor: `#${value.teamColor}` }}
            />
            <Text className="font-bold text-f1-white">{value.nameAcronym}</Text>
            <Text className="flex-1 text-f1-white/60" numberOfLines={1}>
              {value.firstName} {value.lastName}
            </Text>
          </>
        ) : (
          <Text className="flex-1 text-f1-white/40">{placeholder}</Text>
        )}
        <Ionicons name="chevron-down" size={14} color="#F7F7F766" />
      </Pressable>
    </View>
  );
}
