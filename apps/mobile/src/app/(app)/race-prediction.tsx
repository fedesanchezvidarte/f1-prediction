import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { fetchDrivers } from "@f1/shared/lib/drivers";
import { fetchUserRacePredictions } from "@f1/shared/lib/predictions";
import { fetchRaces } from "@f1/shared/lib/races";
import { countryCodeToFlag, getRaceStatus } from "@f1/shared/lib/race-utils";
import type { Driver, FullRacePrediction } from "@f1/shared/types";

import { ConfirmModal } from "@/components/predictions/ConfirmModal";
import { CountdownBar } from "@/components/predictions/CountdownBar";
import { DriverPickerModal } from "@/components/predictions/DriverPickerModal";
import { DriverSlot } from "@/components/predictions/DriverSlot";
import { RoundSelectorModal } from "@/components/predictions/RoundSelectorModal";
import { PredictionStatusBadge, RaceStatusBadge } from "@/components/predictions/StatusBadges";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

/** Which prediction slot the driver picker is currently editing. */
type SlotTarget =
  | { kind: "qualifying"; index: number }
  | { kind: "winner" }
  | { kind: "rest"; index: number }
  | { kind: "fastestLap" }
  | { kind: "fastestPitStop" }
  | { kind: "driverOfTheDay" };

export default function RacePredictionScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  /* ── Data ─────────────────────────────────────────────────────────── */

  const racesQuery = useQuery({
    queryKey: ["races"],
    queryFn: () => fetchRaces(supabase),
  });
  const driversQuery = useQuery({
    queryKey: ["drivers"],
    queryFn: () => fetchDrivers(supabase),
  });
  const races = useMemo(
    () => [...(racesQuery.data ?? [])].sort((a, b) => a.round - b.round),
    [racesQuery.data]
  );
  const predictionsQuery = useQuery({
    queryKey: ["racePredictions", userId],
    queryFn: () => fetchUserRacePredictions(supabase, userId!, races),
    enabled: !!userId && races.length > 0,
  });

  /* ── Local edit state (mirrors the web: edits live locally until submit) ── */

  const [predictions, setPredictions] = useState<FullRacePrediction[] | null>(null);
  useEffect(() => {
    if (predictionsQuery.data) setPredictions(predictionsQuery.data);
  }, [predictionsQuery.data]);

  /* ── Round selection (default: first race whose weekend hasn't ended) ── */

  const defaultRaceIndex = useMemo(() => {
    const now = Date.now();
    const idx = races.findIndex((race) => new Date(race.dateEnd).getTime() > now);
    return idx === -1 ? Math.max(0, races.length - 1) : idx;
  }, [races]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const raceIndex = selectedIndex ?? defaultRaceIndex;

  const [roundPickerOpen, setRoundPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<SlotTarget | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Deadlines that expired while the screen was open (countdown hit zero).
  const [expiredMeetingKeys, setExpiredMeetingKeys] = useState<Set<number>>(new Set());

  /* ── Loading / error states ───────────────────────────────────────── */

  const isPending =
    racesQuery.isPending || driversQuery.isPending || predictionsQuery.isPending || !predictions;
  const loadError = racesQuery.error ?? driversQuery.error ?? predictionsQuery.error;

  if (loadError) {
    return (
      <ScreenShell title={t.nav.predictions}>
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <Text className="text-center text-sm text-f1-white/70">
            {t.predictionsPage.loadError}
          </Text>
          <Pressable
            onPress={() => {
              racesQuery.refetch();
              driversQuery.refetch();
              predictionsQuery.refetch();
            }}
            accessibilityRole="button"
            accessibilityLabel={t.predictionsPage.retry}
            className="min-h-11 items-center justify-center rounded-lg bg-f1-red px-6 active:bg-f1-red-hover"
          >
            <Text className="font-semibold text-white">{t.predictionsPage.retry}</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  if (isPending || races.length === 0) {
    return (
      <ScreenShell title={t.nav.predictions}>
        <View className="flex-1 items-center justify-center p-6">
          {isPending ? (
            <ActivityIndicator color="#CF2637" />
          ) : (
            <Text className="text-sm text-f1-white/50">{t.predictionsPage.noPredictions}</Text>
          )}
        </View>
      </ScreenShell>
    );
  }

  /* ── Derived state for the selected round ─────────────────────────── */

  const currentRace = races[Math.min(raceIndex, races.length - 1)];
  const raceStatus = getRaceStatus(currentRace);
  const drivers = driversQuery.data ?? [];
  const currentPrediction =
    (predictions ?? []).find((p) => p.raceId === currentRace.meetingKey) ?? null;

  const deadlinePassed =
    new Date(currentRace.dateEnd).getTime() <= Date.now() ||
    expiredMeetingKeys.has(currentRace.meetingKey);
  const isEditable = currentPrediction?.status !== "scored" && !deadlinePassed;

  const hasEdits =
    !!currentPrediction &&
    (currentPrediction.qualifyingTop3.some((d) => d !== null) ||
      currentPrediction.raceWinner !== null ||
      currentPrediction.restOfTop10.some((d) => d !== null));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      month: "short",
      day: "numeric",
    });

  /* ── Slot helpers (shared driver pool for winner + rest of top 10) ── */

  function getSlotLabel(slot: SlotTarget): string {
    switch (slot.kind) {
      case "qualifying":
        return `Q${slot.index + 1}`;
      case "winner":
        return t.predictionsPage.raceWinner;
      case "rest":
        return `P${slot.index + 2}`;
      case "fastestLap":
        return t.predictionsPage.fastestLap;
      case "fastestPitStop":
        return t.predictionsPage.fastestPitStop;
      case "driverOfTheDay":
        return t.predictionsPage.driverOfTheDay;
    }
  }

  function getSlotValue(pred: FullRacePrediction, slot: SlotTarget): Driver | null {
    switch (slot.kind) {
      case "qualifying":
        return pred.qualifyingTop3[slot.index];
      case "winner":
        return pred.raceWinner;
      case "rest":
        return pred.restOfTop10[slot.index];
      case "fastestLap":
        return pred.fastestLap;
      case "fastestPitStop":
        return pred.fastestPitStop;
      case "driverOfTheDay":
        return pred.driverOfTheDay;
    }
  }

  function getDisabledForSlot(pred: FullRacePrediction, slot: SlotTarget): Driver[] {
    if (slot.kind === "qualifying") {
      return pred.qualifyingTop3.filter(
        (d, i): d is Driver => d !== null && i !== slot.index
      );
    }
    if (slot.kind === "winner") {
      return pred.restOfTop10.filter((d): d is Driver => d !== null);
    }
    if (slot.kind === "rest") {
      const used: Driver[] = [];
      if (pred.raceWinner) used.push(pred.raceWinner);
      pred.restOfTop10.forEach((d, i) => {
        if (d && i !== slot.index) used.push(d);
      });
      return used;
    }
    return []; // specials may repeat drivers freely
  }

  function updateCurrentPrediction(update: Partial<FullRacePrediction>) {
    setPredictions((prev) =>
      prev
        ? prev.map((p) => (p.raceId === currentRace.meetingKey ? { ...p, ...update } : p))
        : prev
    );
  }

  function applySlot(slot: SlotTarget, driver: Driver | null) {
    if (!currentPrediction) return;
    switch (slot.kind) {
      case "qualifying": {
        const updated = [...currentPrediction.qualifyingTop3];
        updated[slot.index] = driver;
        updateCurrentPrediction({ qualifyingTop3: updated });
        break;
      }
      case "winner":
        updateCurrentPrediction({ raceWinner: driver });
        break;
      case "rest": {
        const updated = [...currentPrediction.restOfTop10];
        updated[slot.index] = driver;
        updateCurrentPrediction({ restOfTop10: updated });
        break;
      }
      case "fastestLap":
        updateCurrentPrediction({ fastestLap: driver });
        break;
      case "fastestPitStop":
        updateCurrentPrediction({ fastestPitStop: driver });
        break;
      case "driverOfTheDay":
        updateCurrentPrediction({ driverOfTheDay: driver });
        break;
    }
  }

  /* ── Submit / reset ───────────────────────────────────────────────── */

  async function invalidatePredictions() {
    await queryClient.invalidateQueries({ queryKey: ["racePredictions", userId] });
  }

  async function handleSubmit() {
    if (!currentPrediction || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        type: "race",
        raceId: currentRace.meetingKey,
        qualifyingTop3: currentPrediction.qualifyingTop3.map((d) => d?.driverNumber ?? null),
        top10: [
          currentPrediction.raceWinner?.driverNumber ?? null,
          ...currentPrediction.restOfTop10.map((d) => d?.driverNumber ?? null),
        ],
        fastestLapDriverNumber: currentPrediction.fastestLap?.driverNumber ?? null,
        fastestPitStopDriverNumber: currentPrediction.fastestPitStop?.driverNumber ?? null,
        driverOfTheDayDriverNumber: currentPrediction.driverOfTheDay?.driverNumber ?? null,
      };
      const res = await apiFetch("/api/predictions/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setErrorMessage(data?.error || t.predictionsPage.submitError);
        return;
      }
      updateCurrentPrediction({ status: "submitted" });
      await invalidatePredictions();
    } catch {
      setErrorMessage(t.predictionsPage.submitError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch("/api/predictions/reset", {
        method: "POST",
        body: JSON.stringify({ type: "race", raceId: currentRace.meetingKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setErrorMessage(data?.error || t.predictionsPage.resetError);
        return;
      }
      updateCurrentPrediction({
        qualifyingTop3: [null, null, null],
        raceWinner: null,
        restOfTop10: Array.from({ length: 9 }, () => null),
        fastestLap: null,
        fastestPitStop: null,
        driverOfTheDay: null,
        status: "pending",
      });
      await invalidatePredictions();
    } catch {
      setErrorMessage(t.predictionsPage.resetError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        racesQuery.refetch(),
        driversQuery.refetch(),
        predictionsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  /* ── Submit button config (mirrors the web status → color mapping) ── */

  const status = currentPrediction?.status ?? "pending";
  const submitConfig =
    status === "scored"
      ? { className: "bg-f1-white/10", textClassName: "text-f1-white/40", label: t.predictionsPage.scored, disabled: true }
      : status === "submitted" && !hasEdits
        ? { className: "bg-f1-blue active:bg-f1-blue/80", textClassName: "text-white", label: t.predictionsPage.submitted, disabled: false }
        : status === "submitted"
          ? { className: "bg-f1-amber active:bg-f1-amber/80", textClassName: "text-black", label: t.predictionsPage.updatePrediction, disabled: false }
          : { className: "bg-f1-green active:bg-f1-green/80", textClassName: "text-black", label: t.predictionsPage.submitPrediction, disabled: false };

  const pickerValue =
    pickerTarget && currentPrediction ? getSlotValue(currentPrediction, pickerTarget) : null;

  return (
    <ScreenShell title={t.nav.predictions}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#CF2637" />
        }
      >
        {/* ── Round selector ── */}
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setSelectedIndex(Math.max(0, raceIndex - 1))}
            disabled={raceIndex === 0}
            accessibilityRole="button"
            accessibilityLabel={t.predictionsPage.previousRound}
            className={`h-11 w-11 items-center justify-center rounded-xl border border-f1-white/10 active:bg-f1-white/10 ${
              raceIndex === 0 ? "opacity-30" : ""
            }`}
          >
            <Ionicons name="chevron-back" size={18} color="#F7F7F7" />
          </Pressable>

          <Pressable
            onPress={() => setRoundPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t.predictionsPage.roundSelectorLabel}: R${currentRace.round} ${currentRace.raceName}`}
            className="min-h-11 flex-1 flex-row items-center gap-2 rounded-xl border border-f1-white/10 bg-f1-white/5 px-3 py-2 active:bg-f1-white/10"
          >
            <Text className="text-base">{countryCodeToFlag(currentRace.countryCode)}</Text>
            <View className="flex-1">
              <Text className="text-xs font-bold tabular-nums text-f1-white/50">
                R{String(currentRace.round).padStart(2, "0")}
              </Text>
              <Text className="text-sm font-semibold text-f1-white" numberOfLines={1}>
                {currentRace.raceName}
              </Text>
              <Text className="text-xs text-f1-white/50">
                {formatDate(currentRace.dateStart)} – {formatDate(currentRace.dateEnd)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#F7F7F766" />
          </Pressable>

          <Pressable
            onPress={() => setSelectedIndex(Math.min(races.length - 1, raceIndex + 1))}
            disabled={raceIndex === races.length - 1}
            accessibilityRole="button"
            accessibilityLabel={t.predictionsPage.nextRound}
            className={`h-11 w-11 items-center justify-center rounded-xl border border-f1-white/10 active:bg-f1-white/10 ${
              raceIndex === races.length - 1 ? "opacity-30" : ""
            }`}
          >
            <Ionicons name="chevron-forward" size={18} color="#F7F7F7" />
          </Pressable>
        </View>

        {/* ── Status row: race badge + countdown / closed banner ── */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <RaceStatusBadge status={raceStatus} />
            <PredictionStatusBadge status={status} />
          </View>
          {!deadlinePassed ? (
            <CountdownBar
              deadline={currentRace.dateEnd}
              onExpire={() =>
                setExpiredMeetingKeys((prev) => new Set(prev).add(currentRace.meetingKey))
              }
            />
          ) : (
            <View className="flex-row items-center gap-2 rounded-lg border border-f1-red/30 bg-f1-red/10 px-3 py-2">
              <Ionicons name="time-outline" size={14} color="#CF2637" />
              <Text className="text-xs font-semibold text-f1-red">
                {t.predictionsPage.predictionsClosed}
              </Text>
            </View>
          )}
        </View>

        {/* ── Form ── */}
        {currentPrediction ? (
          <View className="gap-5">
            {/* Qualifying top 3 */}
            <View className="gap-2">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/60">
                {t.predictionsPage.qualifyingTop3}
              </Text>
              {currentPrediction.qualifyingTop3.map((driver, i) => (
                <DriverSlot
                  key={`q-${i}`}
                  label={`Q${i + 1}`}
                  value={driver}
                  disabled={!isEditable}
                  onPress={() => setPickerTarget({ kind: "qualifying", index: i })}
                />
              ))}
            </View>

            {/* Race winner */}
            <DriverSlot
              label={t.predictionsPage.raceWinner}
              value={currentPrediction.raceWinner}
              disabled={!isEditable}
              onPress={() => setPickerTarget({ kind: "winner" })}
            />

            {/* Rest of top 10 */}
            <View className="gap-2">
              <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/60">
                {t.predictionsPage.restOfTop10}
              </Text>
              {currentPrediction.restOfTop10.map((driver, i) => (
                <DriverSlot
                  key={`p-${i}`}
                  label=""
                  position={i + 2}
                  value={driver}
                  disabled={!isEditable}
                  onPress={() => setPickerTarget({ kind: "rest", index: i })}
                />
              ))}
            </View>

            {/* Specials */}
            <View className="gap-2">
              <DriverSlot
                label={t.predictionsPage.fastestLap}
                value={currentPrediction.fastestLap}
                disabled={!isEditable}
                onPress={() => setPickerTarget({ kind: "fastestLap" })}
              />
              <DriverSlot
                label={t.predictionsPage.fastestPitStop}
                value={currentPrediction.fastestPitStop}
                disabled={!isEditable}
                onPress={() => setPickerTarget({ kind: "fastestPitStop" })}
              />
              <DriverSlot
                label={t.predictionsPage.driverOfTheDay}
                value={currentPrediction.driverOfTheDay}
                disabled={!isEditable}
                onPress={() => setPickerTarget({ kind: "driverOfTheDay" })}
              />
            </View>
          </View>
        ) : (
          <Text className="py-8 text-center text-sm text-f1-white/50">
            {t.predictionsPage.noPredictions}
          </Text>
        )}

        {/* ── Error banner ── */}
        {errorMessage && (
          <View className="flex-row items-center gap-2 rounded-lg border border-f1-red/30 bg-f1-red/10 px-3 py-2.5">
            <Text className="flex-1 text-xs font-medium text-f1-red">{errorMessage}</Text>
            <Pressable
              onPress={() => setErrorMessage(null)}
              accessibilityRole="button"
              accessibilityLabel={t.predictionsPage.dismiss}
              className="min-h-8 justify-center px-2"
            >
              <Text className="text-xs text-f1-red/70">{t.predictionsPage.dismiss}</Text>
            </Pressable>
          </View>
        )}

        {/* ── Points + actions bar ── */}
        <View className="flex-row items-center justify-between border-t border-f1-white/10 pt-4">
          <View className="flex-row items-center gap-2">
            {currentPrediction?.pointsEarned !== null &&
              currentPrediction?.pointsEarned !== undefined && (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="trophy" size={16} color="#FFB100" />
                  <Text className="text-base font-bold tabular-nums text-f1-amber">
                    {currentPrediction.pointsEarned}
                  </Text>
                  <Text className="text-xs text-f1-white/50">{t.predictionsPage.ptsEarned}</Text>
                </View>
              )}
          </View>

          <View className="flex-row items-center gap-2">
            {isEditable && (
              <Pressable
                onPress={() => setShowResetModal(true)}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel={t.predictionsPage.reset}
                className={`min-h-11 flex-row items-center gap-1.5 rounded-lg border border-f1-white/10 px-4 active:bg-f1-white/10 ${
                  isSaving ? "opacity-50" : ""
                }`}
              >
                <Ionicons name="refresh" size={14} color="#F7F7F7AA" />
                <Text className="text-sm font-medium text-f1-white/70">
                  {t.predictionsPage.reset}
                </Text>
              </Pressable>
            )}
            {deadlinePassed ? (
              <View className="min-h-11 flex-row items-center gap-1.5 rounded-lg bg-f1-red/15 px-4">
                <Ionicons name="time-outline" size={14} color="#CF2637" />
                <Text className="text-sm font-semibold text-f1-red">
                  {t.predictionsPage.deadlinePassed}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  if (status === "submitted") {
                    setShowSubmitModal(true);
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={!isEditable || isSaving || submitConfig.disabled}
                accessibilityRole="button"
                accessibilityLabel={submitConfig.label}
                accessibilityState={{ disabled: !isEditable || isSaving || submitConfig.disabled }}
                className={`min-h-11 flex-row items-center gap-2 rounded-lg px-5 ${submitConfig.className} ${
                  isSaving || !isEditable ? "opacity-70" : ""
                }`}
              >
                {isSaving ? <ActivityIndicator size="small" color="#2A2B2A" /> : null}
                <Text className={`text-sm font-semibold ${submitConfig.textClassName}`}>
                  {isSaving ? t.predictionsPage.saving : submitConfig.label}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <RoundSelectorModal
        visible={roundPickerOpen}
        races={races}
        selectedIndex={raceIndex}
        onSelect={(i) => {
          setSelectedIndex(i);
          setRoundPickerOpen(false);
        }}
        onClose={() => setRoundPickerOpen(false)}
      />

      <DriverPickerModal
        visible={pickerTarget !== null}
        label={pickerTarget ? getSlotLabel(pickerTarget) : ""}
        drivers={drivers}
        value={pickerValue}
        disabledDrivers={
          pickerTarget && currentPrediction
            ? getDisabledForSlot(currentPrediction, pickerTarget)
            : []
        }
        onSelect={(driver) => {
          if (pickerTarget) applySlot(pickerTarget, driver);
          setPickerTarget(null);
        }}
        onClose={() => setPickerTarget(null)}
      />

      <ConfirmModal
        visible={showResetModal}
        title={t.predictionsPage.resetPrediction}
        subtitle={currentRace.raceName}
        body={`${t.predictionsPage.resetBody} ${t.predictionsPage.resetBodyPending}${t.predictionsPage.resetBodySuffix}`}
        confirmLabel={t.predictionsPage.resetConfirm}
        confirmingLabel={t.predictionsPage.resetting}
        tone="red"
        isSaving={isSaving}
        onConfirm={() => {
          setShowResetModal(false);
          handleReset();
        }}
        onCancel={() => setShowResetModal(false)}
      />

      <ConfirmModal
        visible={showSubmitModal}
        title={t.predictionsPage.updateConfirmTitle}
        subtitle={currentRace.raceName}
        body={t.predictionsPage.updateConfirmBody}
        confirmLabel={t.predictionsPage.confirmUpdate}
        confirmingLabel={t.predictionsPage.updating}
        tone="blue"
        isSaving={isSaving}
        onConfirm={() => {
          setShowSubmitModal(false);
          handleSubmit();
        }}
        onCancel={() => setShowSubmitModal(false)}
      />
    </ScreenShell>
  );
}

/** Shared wrapper: sets the native header title and the dark background. */
function ScreenShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-f1-black">
      <Stack.Screen options={{ title }} />
      {children}
    </View>
  );
}
