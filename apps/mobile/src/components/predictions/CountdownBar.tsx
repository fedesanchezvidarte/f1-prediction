import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";

import { useLanguage } from "@/providers/LanguageProvider";

function computeTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

/**
 * Live d:h:m:s countdown to the prediction deadline (qualifying start).
 * Only mounted while the deadline is open, so the 1s interval never runs
 * on locked or completed rounds. Calls `onExpire` once when it hits zero.
 */
export function CountdownBar({ deadline, onExpire }: { deadline: string; onExpire: () => void }) {
  const { t, language } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(deadline));
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    setTimeLeft(computeTimeLeft(deadline));
    const timer = setInterval(() => {
      const next = computeTimeLeft(deadline);
      setTimeLeft(next);
      if (next === null) {
        clearInterval(timer);
        onExpireRef.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!timeLeft) return null;

  const pad = (n: number) => String(n).padStart(2, "0");
  const numeric = `${pad(timeLeft.days)}:${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  const announce =
    language === "es"
      ? `${timeLeft.days} días, ${timeLeft.hours} horas, ${timeLeft.minutes} minutos`
      : `${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes`;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${t.predictionsPage.predictionDeadline}: ${announce}`}
      className="flex-row items-center gap-2 rounded-lg border border-f1-amber/30 bg-f1-amber/10 px-3 py-2"
    >
      <Text className="flex-1 text-xs font-medium text-f1-amber">
        {t.predictionsPage.predictionDeadline}
      </Text>
      <Text className="text-sm font-bold tabular-nums text-f1-white">{numeric}</Text>
    </View>
  );
}
