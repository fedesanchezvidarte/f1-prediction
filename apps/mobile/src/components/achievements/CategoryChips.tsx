import { Pressable, ScrollView, Text } from "react-native";

import type { AchievementCategory } from "@f1/shared/types";

export type CategoryFilter = AchievementCategory | "all";

interface ChipItem {
  value: CategoryFilter;
  label: string;
  count: number;
}

function Chip({
  item,
  active,
  onSelect,
}: {
  item: ChipItem;
  active: boolean;
  onSelect: (value: CategoryFilter) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(item.value)}
      accessibilityRole="button"
      accessibilityLabel={`${item.label} (${item.count})`}
      accessibilityState={{ selected: active }}
      className={`min-h-9 flex-row items-center gap-1.5 rounded-lg border px-3 py-1.5 ${
        active ? "border-f1-purple/40 bg-f1-white/5" : "border-f1-white/10 active:bg-f1-white/10"
      }`}
    >
      <Text
        className={`text-[11px] font-medium ${active ? "text-f1-purple" : "text-f1-white/50"}`}
      >
        {item.label}
      </Text>
      <Text
        className={`rounded-md px-1 py-0.5 text-[9px] tabular-nums ${
          active ? "bg-f1-purple/20 text-f1-purple" : "bg-f1-white/10 text-f1-white/50"
        }`}
      >
        {item.count}
      </Text>
    </Pressable>
  );
}

/**
 * Horizontally scrollable category filter chips (All / Predictions /
 * Accuracy / Milestones / Special), each with a count badge. Ports the web
 * FilterButton row.
 */
export function CategoryChips({
  items,
  active,
  onSelect,
}: {
  items: ChipItem[];
  active: CategoryFilter;
  onSelect: (value: CategoryFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2"
    >
      {items.map((item) => (
        <Chip key={item.value} item={item} active={active === item.value} onSelect={onSelect} />
      ))}
    </ScrollView>
  );
}
