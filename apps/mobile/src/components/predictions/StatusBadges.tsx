import { Text, View } from "react-native";
import type { PredictionStatus, RaceStatus } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Small pill badges mirroring the web prediction page: one for the
 * prediction lifecycle (pending / submitted / scored) and one for the
 * race weekend status (upcoming / live / completed).
 */
export function PredictionStatusBadge({ status }: { status: PredictionStatus }) {
  const { t } = useLanguage();
  const config: Record<PredictionStatus, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-f1-amber/15", text: "text-f1-amber", label: t.predictionsPage.pending },
    submitted: { bg: "bg-f1-blue/15", text: "text-f1-blue", label: t.predictionsPage.submitted },
    scored: { bg: "bg-f1-green/15", text: "text-f1-green", label: t.predictionsPage.scored },
  };
  const c = config[status];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${c.bg}`}>
      <Text className={`text-[11px] font-semibold ${c.text}`}>{c.label}</Text>
    </View>
  );
}

export function RaceStatusBadge({ status }: { status: RaceStatus }) {
  const { t } = useLanguage();
  const config: Record<RaceStatus, { bg: string; text: string; label: string }> = {
    upcoming: { bg: "bg-f1-blue/15", text: "text-f1-blue", label: t.predictionsPage.upcoming },
    live: { bg: "bg-f1-red/15", text: "text-f1-red", label: t.predictionsPage.live },
    completed: { bg: "bg-f1-green/15", text: "text-f1-green", label: t.predictionsPage.completed },
  };
  const c = config[status];
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${c.bg}`}>
      <Text className={`text-[11px] font-semibold ${c.text}`}>{c.label}</Text>
    </View>
  );
}
