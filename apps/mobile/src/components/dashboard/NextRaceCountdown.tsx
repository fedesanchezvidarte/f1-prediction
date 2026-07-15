import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { countryCodeToFlag, getRaceStatus } from "@f1/shared/lib/race-utils";
import type { Race } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";
import { useTheme } from "@/providers/ThemeProvider";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/** Active prediction deadline: the sprint deadline while it's still open, else the race deadline. */
function getActiveDeadline(race: Race): string {
  const now = Date.now();
  const sprintDeadline = race.sprintDateEnd ? new Date(race.sprintDateEnd).getTime() : null;
  return sprintDeadline && sprintDeadline > now ? race.sprintDateEnd! : race.dateEnd;
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <View className="items-center">
      <Text className="text-3xl font-bold tabular-nums text-f1-white">
        {String(value).padStart(2, "0")}
      </Text>
      <Text className="text-[11px] uppercase tracking-wide text-f1-white/60">{label}</Text>
    </View>
  );
}

/**
 * Ports the web NextRaceCountdown: next-race info, live/upcoming status badge,
 * ticking d:h:m:s countdown to the active prediction deadline, and a CTA that
 * jumps to the Predictions tab (which already defaults to the next open round).
 */
export function NextRaceCountdown({ race }: { race: Race }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const router = useRouter();

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(getActiveDeadline(race))
  );
  const [status, setStatus] = useState(() => getRaceStatus(race));
  const [deadlinePassed, setDeadlinePassed] = useState(
    () => new Date(getActiveDeadline(race)).getTime() <= Date.now()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const deadline = getActiveDeadline(race);
      setTimeLeft(calculateTimeLeft(deadline));
      setStatus(getRaceStatus(race));
      setDeadlinePassed(new Date(deadline).getTime() <= Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [race]);

  const isWeekendLive = status === "live";
  const showLiveBadge = deadlinePassed || isWeekendLive;

  return (
    <View className="rounded-2xl border border-f1-white/10 bg-f1-white/5 p-5">
      {/* Header: label + status badge */}
      <View className="flex-row items-start justify-between">
        <Text className="text-xs font-medium uppercase tracking-wider text-f1-white/60">
          {showLiveBadge ? t.nextRace.raceWeekend : t.nextRace.nextRace}
        </Text>
        {showLiveBadge ? (
          <View className="flex-row items-center gap-1.5 rounded-full bg-f1-red/15 px-2.5 py-1">
            <Ionicons name="radio" size={12} color={colors.red} />
            <Text className="text-xs font-semibold uppercase text-f1-red">{t.nextRace.live}</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-1.5 rounded-full bg-f1-green/15 px-2.5 py-1">
            <Ionicons name="time-outline" size={12} color={colors.green} />
            <Text className="text-xs font-semibold uppercase text-f1-green">
              {t.nextRace.upcoming}
            </Text>
          </View>
        )}
      </View>

      {/* Race name + location */}
      <View className="mt-3">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">{countryCodeToFlag(race.countryCode)}</Text>
          <Text className="flex-1 text-base font-semibold text-f1-white" numberOfLines={1}>
            {race.raceName}
          </Text>
        </View>
        <View className="mt-1 flex-row items-center gap-1">
          <Ionicons name="location-outline" size={14} color={colors.foregroundMuted} />
          <Text className="text-sm text-f1-white/60" numberOfLines={1}>
            {race.location}, {race.countryName}
          </Text>
        </View>
      </View>

      {/* Countdown / lights-out */}
      {!deadlinePassed ? (
        <View
          className="mt-4"
          accessibilityRole="text"
          accessibilityLabel={`${t.nextRace.predictionDeadline}: ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`}
        >
          <View className="flex-row items-start justify-center gap-3">
            <TimeUnit value={timeLeft.days} label={t.nextRace.days} />
            <Text className="pt-1.5 text-xl text-f1-white/40">:</Text>
            <TimeUnit value={timeLeft.hours} label={t.nextRace.hrs} />
            <Text className="pt-1.5 text-xl text-f1-white/40">:</Text>
            <TimeUnit value={timeLeft.minutes} label={t.nextRace.min} />
            <Text className="pt-1.5 text-xl text-f1-white/40">:</Text>
            <TimeUnit value={timeLeft.seconds} label={t.nextRace.sec} />
          </View>
          <Text className="mt-2 text-center text-xs text-f1-white/60">
            {t.nextRace.predictionDeadline}
          </Text>
        </View>
      ) : (
        <View className="mt-4 rounded-lg bg-f1-red/5 px-3 py-3">
          <Text className="text-center text-base font-medium text-f1-white">
            {t.nextRace.lightsOut}
          </Text>
        </View>
      )}

      {/* CTA while the deadline is open */}
      {!deadlinePassed ? (
        <Pressable
          onPress={() => router.navigate("/race-prediction")}
          accessibilityRole="button"
          accessibilityLabel={t.nextRace.makePrediction}
          className="mt-4 min-h-12 flex-row items-center justify-center gap-1 rounded-lg bg-f1-red active:bg-f1-red-hover"
        >
          <Text className="text-sm font-semibold text-white">{t.nextRace.makePrediction}</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}
