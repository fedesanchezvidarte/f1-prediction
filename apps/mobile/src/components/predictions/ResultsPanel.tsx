import { Text, View } from "react-native";
import type { Driver, RaceResult, SprintResult } from "@f1/shared/types";

import { useLanguage } from "@/providers/LanguageProvider";

/**
 * Collapsible official-results panels shown above the prediction form once a
 * round has results (mirrors the web ResultsDisplay / SprintResultsDisplay):
 * headline fields (pole, winner, fastest lap, …), the qualifying top 3 and
 * the full finishing order as compact chips.
 */

function ResultItem({ label, driver }: { label: string; driver: Driver }) {
  return (
    <View className="w-[47%] gap-0.5">
      <Text className="text-[10px] text-f1-white/50">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `#${driver.teamColor}` }}
        />
        <Text className="text-xs font-semibold text-f1-white">{driver.nameAcronym}</Text>
        <Text className="flex-1 text-xs text-f1-white/50" numberOfLines={1}>
          {driver.lastName}
        </Text>
      </View>
    </View>
  );
}

function DriverChip({ prefix, driver }: { prefix: string; driver: Driver }) {
  return (
    <View className="flex-row items-center gap-1 rounded-md bg-f1-white/10 px-2 py-1">
      <Text className="text-[10px] tabular-nums text-f1-white/50">{prefix}</Text>
      <View
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: `#${driver.teamColor}` }}
      />
      <Text className="text-[10px] font-medium text-f1-white">{driver.nameAcronym}</Text>
    </View>
  );
}

function QualifyingChips({ drivers }: { drivers: Driver[] }) {
  const { t } = useLanguage();
  if (drivers.length === 0) return null;
  return (
    <View className="gap-1">
      <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
        {t.predictionsPage.qualifyingTop3}
      </Text>
      <View className="flex-row flex-wrap gap-1.5">
        {drivers.map((driver, i) => (
          <DriverChip key={driver.driverNumber} prefix={`Q${i + 1}`} driver={driver} />
        ))}
      </View>
    </View>
  );
}

export function RaceResultsPanel({ result }: { result: RaceResult }) {
  const { t } = useLanguage();
  return (
    <View className="gap-3 rounded-xl border border-f1-green/20 bg-f1-green/5 p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-green">
        {t.predictionsPage.raceResults}
      </Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-2">
        {result.qualifyingTop3[0] && (
          <ResultItem label={t.predictionsPage.pole} driver={result.qualifyingTop3[0]} />
        )}
        <ResultItem label={t.predictionsPage.winner} driver={result.raceWinner} />
        <ResultItem label={t.predictionsPage.fastestLap} driver={result.fastestLap} />
        {result.fastestPitStop && (
          <ResultItem label={t.predictionsPage.fastestPit} driver={result.fastestPitStop} />
        )}
        {result.driverOfTheDay && (
          <ResultItem label={t.predictionsPage.driverOfTheDay} driver={result.driverOfTheDay} />
        )}
      </View>
      <QualifyingChips drivers={result.qualifyingTop3} />
      <View className="gap-1">
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
          {t.predictionsPage.top10}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {result.top10.map((driver, i) => (
            <DriverChip key={driver.driverNumber} prefix={`${i + 1}.`} driver={driver} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function SprintResultsPanel({ result }: { result: SprintResult }) {
  const { t } = useLanguage();
  return (
    <View className="gap-3 rounded-xl border border-f1-green/20 bg-f1-green/5 p-3">
      <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-green">
        {t.predictionsPage.sprintResults}
      </Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-2">
        {result.qualifyingTop3[0] && (
          <ResultItem label={t.predictionsPage.sprintPole} driver={result.qualifyingTop3[0]} />
        )}
        <ResultItem label={t.predictionsPage.sprintWinner} driver={result.sprintWinner} />
        <ResultItem label={t.predictionsPage.fastestLap} driver={result.fastestLap} />
      </View>
      <QualifyingChips drivers={result.qualifyingTop3} />
      <View className="gap-1">
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/50">
          {t.predictionsPage.top8}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {result.top8.map((driver, i) => (
            <DriverChip key={driver.driverNumber} prefix={`${i + 1}.`} driver={driver} />
          ))}
        </View>
      </View>
    </View>
  );
}
