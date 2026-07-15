import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { countryCodeToFlag, type RaceCalendarEntry } from "@f1/shared/lib/race-utils";
import type { PredictionStatus } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

interface RaceCalendarModalProps {
  visible: boolean;
  entries: RaceCalendarEntry[];
  onClose: () => void;
}

/** Fixed row height so initialScrollIndex can jump straight to the next race. */
const ROW_HEIGHT = 66;

/**
 * Ports the web RaceCalendarModal as a bottom sheet: the full season list with
 * per-race prediction status, opened scrolled to the next (live/upcoming) race.
 */
export function RaceCalendarModal({ visible, entries, onClose }: RaceCalendarModalProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // First non-completed race: highlighted and used as the initial scroll target.
  const nextEntryIndex = entries.findIndex(
    (e) => e.raceStatus === "live" || e.raceStatus === "upcoming"
  );

  const seasonYear =
    entries.length > 0
      ? new Date(entries[0].race.dateStart).getFullYear()
      : new Date().getFullYear();

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
          className="h-[85%] rounded-t-3xl border-t border-f1-white/10 bg-card"
          style={{ paddingBottom: insets.bottom }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-f1-white/10 px-5 py-4">
            <Text className="flex-1 text-base font-bold uppercase tracking-wider text-f1-white">
              {t.raceCalendar.modalTitle.replace("{{year}}", String(seasonYear))}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t.raceCalendar.closeModal}
              className="h-9 w-9 items-center justify-center rounded-full bg-f1-white/10 active:bg-f1-white/20"
            >
              <Ionicons name="close" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          <FlatList
            data={entries}
            keyExtractor={(entry) => String(entry.race.meetingKey)}
            contentContainerClassName="gap-1 p-4"
            initialScrollIndex={nextEntryIndex > 0 ? nextEntryIndex : undefined}
            getItemLayout={(_, index) => ({
              // gap-1 adds 4px between the fixed-height rows
              length: ROW_HEIGHT + 4,
              offset: (ROW_HEIGHT + 4) * index,
              index,
            })}
            renderItem={({ item: entry, index }) => (
              <CalendarRow entry={entry} isNext={index === nextEntryIndex} />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function CalendarRow({ entry, isNext }: { entry: RaceCalendarEntry; isNext: boolean }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { race, raceStatus, predictionStatus } = entry;
  const isCompleted = raceStatus === "completed";
  const isLive = raceStatus === "live";

  return (
    <View
      style={{ height: ROW_HEIGHT }}
      className={`flex-row items-center gap-3 rounded-xl px-3 ${
        isNext ? "border border-f1-red/30 bg-f1-red/5" : isCompleted ? "opacity-50" : ""
      }`}
    >
      {/* Round number */}
      <View
        className={`h-8 w-8 items-center justify-center rounded-full ${
          isLive ? "bg-f1-red" : isNext ? "bg-f1-red/20" : "bg-f1-white/10"
        }`}
      >
        <Text
          className={`text-xs font-bold ${
            isLive ? "text-white" : isNext ? "text-f1-red" : "text-f1-white/60"
          }`}
        >
          {race.round}
        </Text>
      </View>

      {/* Race info */}
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-sm">{countryCodeToFlag(race.countryCode)}</Text>
          <Text className="flex-1 text-sm font-medium text-f1-white" numberOfLines={1}>
            {race.raceName}
          </Text>
        </View>
        <Text className="mt-0.5 text-xs text-f1-white/60" numberOfLines={1}>
          {race.circuitShortName} · {formatLocalDate(race.dateStart, race.dateEnd)}
        </Text>
      </View>

      {/* Badges */}
      <View className="flex-row items-center gap-1.5">
        {race.hasSprint ? (
          <View className="flex-row items-center gap-0.5 rounded-full bg-f1-purple/10 px-1.5 py-1">
            <Ionicons name="flash" size={11} color={colors.purple} />
            <Text className="text-[10px] font-semibold text-f1-purple">
              {t.raceCalendar.sprint}
            </Text>
          </View>
        ) : null}

        {isLive ? (
          <View className="flex-row items-center gap-1 rounded-full bg-f1-red/10 px-2 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-f1-red" />
            <Text className="text-[10px] font-semibold text-f1-red">{t.raceCalendar.live}</Text>
          </View>
        ) : predictionStatus ? (
          <PredictionBadge status={predictionStatus} />
        ) : null}
      </View>
    </View>
  );
}

function PredictionBadge({ status }: { status: PredictionStatus }) {
  const { t } = useLanguage();
  const config = {
    pending: { label: t.predictionsCard.pending, cls: "bg-f1-amber/10", text: "text-f1-amber" },
    submitted: { label: t.predictionsCard.submitted, cls: "bg-f1-blue/10", text: "text-f1-blue" },
    scored: { label: t.predictionsCard.scored, cls: "bg-f1-green/10", text: "text-f1-green" },
  } as const;
  const { label, cls, text } = config[status];
  return (
    <View className={`rounded-full px-2 py-1 ${cls}`}>
      <Text className={`text-[10px] font-semibold ${text}`}>{label}</Text>
    </View>
  );
}

/** "14–16 Mar" style local date range, same as the web modal. */
function formatLocalDate(dateStart: string, dateEnd: string): string {
  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  const dayFmt = new Intl.DateTimeFormat(undefined, { day: "numeric" });
  const monthFmt = new Intl.DateTimeFormat(undefined, { month: "short" });

  const startDay = dayFmt.format(start);
  const endDay = dayFmt.format(end);
  const month = monthFmt.format(end);

  if (startDay === endDay) return `${startDay} ${month}`;
  return `${startDay}–${endDay} ${month}`;
}
