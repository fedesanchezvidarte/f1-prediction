import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { ChampionPredictionPhase } from "@f1/shared/lib/race-utils";
import type { ChampionPrediction, TeamBestDriverPrediction, TeamWithDrivers } from "@f1/shared/types";

import { DriverSlot } from "@/components/predictions/DriverSlot";
import { useLanguage } from "@/providers/LanguageProvider";

/** Champion driver slots handled by the parent's DriverPickerModal. */
export type ChampionDriverSlot = "wdc" | "mostWins" | "mostPodiums" | "mostDnfs";

interface ChampionFormProps {
  prediction: ChampionPrediction;
  teamBestDriverPredictions: TeamBestDriverPrediction[];
  teamsWithDrivers: TeamWithDrivers[];
  isEditable: boolean;
  championPhase: ChampionPredictionPhase;
  /** Opens the driver picker for one of the champion driver slots. */
  onPickDriver: (slot: ChampionDriverSlot) => void;
  /** Opens the team picker for the WCC slot. */
  onPickTeam: () => void;
  onTeamBestDriverChange: (teamId: number, driverId: number, driverNumber: number) => void;
}

function PointsPill({ points }: { points: number }) {
  if (points <= 0) return null;
  return (
    <View className="rounded-full bg-f1-green/15 px-1.5 py-0.5">
      <Text className="text-[9px] font-bold tabular-nums text-f1-green">+{points}</Text>
    </View>
  );
}

/**
 * Season-champion prediction form: WDC/WCC winners, most wins/podiums/DNFs
 * and the per-team best-driver picks — mirrors the web ChampionForm with
 * touch-friendly slots and a bottom-sheet team picker owned by the parent.
 */
export function ChampionForm({
  prediction,
  teamBestDriverPredictions,
  teamsWithDrivers,
  isEditable,
  championPhase,
  onPickDriver,
  onPickTeam,
  onTeamBestDriverChange,
}: ChampionFormProps) {
  const { t } = useLanguage();
  const scored = prediction.status === "scored";

  return (
    <View className="gap-5">
      {/* Phase banner */}
      {championPhase === "closed" ? (
        <View className="flex-row items-center gap-2 rounded-lg border border-f1-red/30 bg-f1-red/10 px-3 py-2">
          <Ionicons name="information-circle-outline" size={14} color="#CF2637" />
          <Text className="flex-1 text-xs text-f1-red">
            {t.predictionsPage.championClosedWarning}
          </Text>
        </View>
      ) : championPhase === "half" ? (
        <View className="flex-row items-center gap-2 rounded-lg border border-f1-amber/30 bg-f1-amber/10 px-3 py-2">
          <Ionicons name="information-circle-outline" size={14} color="#FFB100" />
          <Text className="flex-1 text-xs text-f1-amber">
            {t.predictionsPage.halfPointsWarning}
          </Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-2 rounded-lg border border-f1-blue/30 bg-f1-blue/10 px-3 py-2">
          <Ionicons name="information-circle-outline" size={14} color="#3C91E6" />
          <Text className="flex-1 text-xs text-f1-blue">
            {t.predictionsPage.championshipInfoPhase1}
          </Text>
        </View>
      )}

      {/* WDC */}
      <DriverSlot
        label={t.predictionsPage.wdc}
        value={prediction.wdcWinner}
        disabled={!isEditable}
        pointsAwarded={scored ? prediction.wdcPoints : null}
        onPress={() => onPickDriver("wdc")}
      />

      {/* WCC */}
      <View className="gap-1">
        <View className="flex-row items-center gap-1">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/60">
            {t.predictionsPage.wcc}
          </Text>
          {scored && (
            <View className="ml-auto">
              <PointsPill points={prediction.wccPoints} />
            </View>
          )}
        </View>
        <Pressable
          onPress={onPickTeam}
          disabled={!isEditable}
          accessibilityRole="button"
          accessibilityLabel={`${t.predictionsPage.wcc}: ${
            prediction.wccWinner ?? t.predictionsPage.selectTeam
          }`}
          accessibilityState={{ disabled: !isEditable }}
          className={`min-h-12 flex-row items-center gap-2 rounded-xl border px-3 py-2.5 ${
            !isEditable
              ? "border-f1-white/5 bg-f1-white/5 opacity-60"
              : "border-f1-white/10 bg-f1-white/5 active:bg-f1-white/10"
          }`}
        >
          {prediction.wccWinner ? (
            <>
              <View
                className="h-6 w-1.5 rounded-full"
                style={{
                  backgroundColor: `#${
                    teamsWithDrivers.find((team) => team.name === prediction.wccWinner)?.color ??
                    "737373"
                  }`,
                }}
              />
              <Text className="flex-1 font-semibold text-f1-white" numberOfLines={1}>
                {prediction.wccWinner}
              </Text>
            </>
          ) : (
            <Text className="flex-1 text-f1-white/40">{t.predictionsPage.selectTeam}</Text>
          )}
          <Ionicons name="chevron-down" size={14} color="#F7F7F766" />
        </Pressable>
      </View>

      {/* Most Wins / Most Podiums / Most DNFs */}
      <View className="gap-2 border-t border-f1-white/10 pt-4">
        <DriverSlot
          label={t.predictionsPage.mostWins}
          value={prediction.mostWinsDriver}
          disabled={!isEditable}
          pointsAwarded={scored ? prediction.mostWinsPoints : null}
          onPress={() => onPickDriver("mostWins")}
        />
        <DriverSlot
          label={t.predictionsPage.mostPodiums}
          value={prediction.mostPodiumsDriver}
          disabled={!isEditable}
          pointsAwarded={scored ? prediction.mostPodiumsPoints : null}
          onPress={() => onPickDriver("mostPodiums")}
        />
        <DriverSlot
          label={t.predictionsPage.mostDnfs}
          value={prediction.mostDnfsDriver}
          disabled={!isEditable}
          pointsAwarded={scored ? prediction.mostDnfsPoints : null}
          onPress={() => onPickDriver("mostDnfs")}
        />
      </View>

      {/* Team Best Driver */}
      <View className="gap-2 border-t border-f1-white/10 pt-4">
        <View className="gap-0.5">
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/60">
            {t.predictionsPage.teamBestDriver}
          </Text>
          <Text className="text-[10px] text-f1-white/40">
            {t.predictionsPage.teamBestDriverSub}
          </Text>
        </View>
        {teamsWithDrivers.map((team) => {
          const pred = teamBestDriverPredictions.find((p) => p.teamId === team.id);
          const selectedDriverNumber = pred?.driverNumber ?? null;
          return (
            <View
              key={team.id}
              className="flex-row items-center gap-2 rounded-xl border border-f1-white/10 bg-f1-white/5 px-3 py-2"
            >
              <View
                className="h-6 w-1.5 rounded-full"
                style={{ backgroundColor: `#${team.color}` }}
              />
              <Text className="flex-1 text-xs font-medium text-f1-white" numberOfLines={1}>
                {team.name}
              </Text>
              {pred?.isHalfPoints && (
                <Text className="text-[10px] font-bold text-f1-amber">½</Text>
              )}
              {pred?.status === "scored" && <PointsPill points={pred.pointsEarned} />}
              <View className="flex-row gap-1.5">
                {team.drivers.map((d) => {
                  const isSelected = selectedDriverNumber === d.driverNumber;
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => {
                        if (!isEditable) return;
                        onTeamBestDriverChange(team.id, d.id, d.driverNumber);
                      }}
                      disabled={!isEditable}
                      accessibilityRole="button"
                      accessibilityLabel={`${team.name}: ${d.firstName} ${d.lastName}`}
                      accessibilityState={{ selected: isSelected, disabled: !isEditable }}
                      className={`min-h-10 items-center justify-center rounded-lg px-3 ${
                        isSelected
                          ? "bg-f1-red"
                          : !isEditable
                            ? "bg-f1-white/5 opacity-50"
                            : "bg-f1-white/10 active:bg-f1-white/20"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-semibold ${
                          isSelected ? "text-white" : "text-f1-white/70"
                        }`}
                      >
                        {d.nameAcronym}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
