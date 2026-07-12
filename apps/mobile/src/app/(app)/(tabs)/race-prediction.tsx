import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { fetchChampionPredictionData } from "@f1/shared/lib/champion-predictions";
import { fetchDrivers } from "@f1/shared/lib/drivers";
import {
  computeRaceMatchStatuses,
  computeSprintMatchStatuses,
} from "@f1/shared/lib/prediction-status";
import {
  fetchUserRacePredictions,
  fetchUserSprintPredictions,
} from "@f1/shared/lib/predictions";
import {
  countryCodeToFlag,
  getChampionPredictionPhase,
  getRaceStatus,
} from "@f1/shared/lib/race-utils";
import { fetchRaces } from "@f1/shared/lib/races";
import { fetchRaceResults, fetchSprintResults } from "@f1/shared/lib/results";
import {
  computeRaceFieldPoints,
  computeSprintFieldPoints,
  type RaceFieldPoints,
  type SprintFieldPoints,
} from "@f1/shared/lib/scoring";
import { fetchTeamsWithDrivers } from "@f1/shared/lib/teams";
import type {
  ChampionPrediction,
  Driver,
  FullRacePrediction,
  PredictionStatus,
  SprintPrediction,
  TeamBestDriverPrediction,
} from "@f1/shared/types";

import { BonusBadges, type BonusBadge } from "@/components/predictions/BonusBadges";
import { ChampionForm, type ChampionDriverSlot } from "@/components/predictions/ChampionForm";
import { ConfirmModal } from "@/components/predictions/ConfirmModal";
import { CountdownBar } from "@/components/predictions/CountdownBar";
import { DriverPickerModal } from "@/components/predictions/DriverPickerModal";
import { DriverSlot } from "@/components/predictions/DriverSlot";
import { PredictionTabs, type PredictionTab } from "@/components/predictions/PredictionTabs";
import { RaceResultsPanel, SprintResultsPanel } from "@/components/predictions/ResultsPanel";
import { RoundSelectorModal } from "@/components/predictions/RoundSelectorModal";
import { PredictionStatusBadge, RaceStatusBadge } from "@/components/predictions/StatusBadges";
import { TeamPickerModal } from "@/components/predictions/TeamPickerModal";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

/** Which prediction slot the driver picker is currently editing. */
type SlotTarget =
  // Race tab
  | { kind: "qualifying"; index: number }
  | { kind: "winner" }
  | { kind: "rest"; index: number }
  | { kind: "fastestLap" }
  | { kind: "fastestPitStop" }
  | { kind: "driverOfTheDay" }
  // Sprint tab
  | { kind: "sprintQualifying"; index: number }
  | { kind: "sprintWinner" }
  | { kind: "sprintRest"; index: number }
  | { kind: "sprintFastestLap" }
  // Champion tab
  | { kind: "champion"; slot: ChampionDriverSlot };

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
  const sprintPredictionsQuery = useQuery({
    queryKey: ["sprintPredictions", userId],
    queryFn: () => fetchUserSprintPredictions(supabase, userId!, races),
    enabled: !!userId && races.length > 0,
  });
  const teamsQuery = useQuery({
    queryKey: ["teamsWithDrivers"],
    queryFn: () => fetchTeamsWithDrivers(supabase),
  });
  const teamsWithDrivers = teamsQuery.data;
  const championQuery = useQuery({
    queryKey: ["championPrediction", userId],
    queryFn: () => fetchChampionPredictionData(supabase, userId!, teamsWithDrivers!),
    enabled: !!userId && !!teamsWithDrivers,
  });
  const raceResultsQuery = useQuery({
    queryKey: ["raceResults"],
    queryFn: () => fetchRaceResults(supabase),
  });
  const sprintResultsQuery = useQuery({
    queryKey: ["sprintResults"],
    queryFn: () => fetchSprintResults(supabase),
  });

  /* ── Local edit state (mirrors the web: edits live locally until submit) ── */

  const [predictions, setPredictions] = useState<FullRacePrediction[] | null>(null);
  useEffect(() => {
    if (predictionsQuery.data) setPredictions(predictionsQuery.data);
  }, [predictionsQuery.data]);

  const [sprintPreds, setSprintPreds] = useState<SprintPrediction[] | null>(null);
  useEffect(() => {
    if (sprintPredictionsQuery.data) setSprintPreds(sprintPredictionsQuery.data);
  }, [sprintPredictionsQuery.data]);

  const [champPred, setChampPred] = useState<ChampionPrediction | null>(null);
  const [teamBestPreds, setTeamBestPreds] = useState<TeamBestDriverPrediction[] | null>(null);
  // Last successfully saved champion state, for changed-field detection on updates.
  const savedChampPred = useRef<ChampionPrediction | null>(null);
  const savedTeamBestPreds = useRef<TeamBestDriverPrediction[] | null>(null);
  useEffect(() => {
    if (championQuery.data) {
      setChampPred(championQuery.data.championPrediction);
      setTeamBestPreds(championQuery.data.teamBestDriverPredictions);
      savedChampPred.current = championQuery.data.championPrediction;
      savedTeamBestPreds.current = championQuery.data.teamBestDriverPredictions;
    }
  }, [championQuery.data]);

  /* ── Tab + round selection (default: first race whose weekend hasn't ended) ── */

  const [tab, setTab] = useState<PredictionTab>("race");

  const defaultRaceIndex = useMemo(() => {
    const now = Date.now();
    const idx = races.findIndex((race) => new Date(race.dateEnd).getTime() > now);
    return idx === -1 ? Math.max(0, races.length - 1) : idx;
  }, [races]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const raceIndex = selectedIndex ?? defaultRaceIndex;

  function selectRound(index: number) {
    setSelectedIndex(index);
    // Leaving a sprint tab for a round without a sprint falls back to Race.
    if (tab === "sprint" && !races[index]?.hasSprint) setTab("race");
  }

  const [roundPickerOpen, setRoundPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<SlotTarget | null>(null);
  const [teamPickerOpen, setTeamPickerOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Deadlines that expired while the screen was open (countdown hit zero).
  const [expiredRaceKeys, setExpiredRaceKeys] = useState<Set<number>>(new Set());
  const [expiredSprintKeys, setExpiredSprintKeys] = useState<Set<number>>(new Set());

  /* ── Loading / error states ───────────────────────────────────────── */

  const isPending =
    racesQuery.isPending || driversQuery.isPending || predictionsQuery.isPending || !predictions;
  const loadError = racesQuery.error ?? driversQuery.error ?? predictionsQuery.error;

  if (loadError) {
    return (
      <ScreenShell>
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
      <ScreenShell>
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
  const currentSprintPred =
    (sprintPreds ?? []).find((p) => p.raceId === currentRace.meetingKey) ?? null;
  const currentResult = raceResultsQuery.data?.[currentRace.meetingKey];
  const currentSprintResult = sprintResultsQuery.data?.[currentRace.meetingKey];

  // Separate deadlines: sprint uses sprintDateEnd, race uses dateEnd.
  const raceDeadline = currentRace.dateEnd;
  const sprintDeadline = currentRace.sprintDateEnd ?? currentRace.dateEnd;
  const raceDeadlinePassed =
    new Date(raceDeadline).getTime() <= Date.now() ||
    expiredRaceKeys.has(currentRace.meetingKey);
  const sprintDeadlinePassed =
    new Date(sprintDeadline).getTime() <= Date.now() ||
    expiredSprintKeys.has(currentRace.meetingKey);

  const championPhase = getChampionPredictionPhase(races);
  const isChampionTab = tab === "champion";
  const seasonStarted = championPhase !== "full";
  const champNeedsAttention =
    championPhase === "full" && (champPred ? champPred.status !== "scored" : false);
  const sprintNeedsAttention =
    !sprintDeadlinePassed && currentSprintPred?.status !== "scored";

  const activeDeadline = tab === "sprint" ? sprintDeadline : raceDeadline;
  const deadlinePassed = tab === "sprint" ? sprintDeadlinePassed : raceDeadlinePassed;

  const isEditable = isChampionTab
    ? !!champPred && champPred.status !== "scored" && championPhase !== "closed"
    : tab === "sprint"
      ? currentSprintPred?.status !== "scored" && !sprintDeadlinePassed
      : currentPrediction?.status !== "scored" && !raceDeadlinePassed;

  const hasEdits = isChampionTab
    ? !!champPred &&
      (champPred.wdcWinner !== null ||
        champPred.wccWinner !== null ||
        champPred.mostDnfsDriver !== null ||
        champPred.mostPodiumsDriver !== null ||
        champPred.mostWinsDriver !== null ||
        (teamBestPreds ?? []).some((p) => p.driverNumber !== null))
    : tab === "sprint"
      ? !!currentSprintPred &&
        (currentSprintPred.qualifyingTop3.some((d) => d !== null) ||
          currentSprintPred.sprintWinner !== null ||
          currentSprintPred.restOfTop8.some((d) => d !== null))
      : !!currentPrediction &&
        (currentPrediction.qualifyingTop3.some((d) => d !== null) ||
          currentPrediction.raceWinner !== null ||
          currentPrediction.restOfTop10.some((d) => d !== null));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      month: "short",
      day: "numeric",
    });

  /* ── Results comparison (match statuses + per-field points) ───────── */

  const raceMatchStatuses =
    currentResult && currentPrediction
      ? computeRaceMatchStatuses(currentPrediction, currentResult)
      : null;
  const raceFieldPoints: RaceFieldPoints | null =
    currentResult && currentPrediction && currentPrediction.status === "scored"
      ? computeRaceFieldPoints({
          predTop10: [
            currentPrediction.raceWinner?.driverNumber ?? null,
            ...currentPrediction.restOfTop10.map((d) => d?.driverNumber ?? null),
          ],
          predQualifyingTop3: currentPrediction.qualifyingTop3.map(
            (d) => d?.driverNumber ?? null
          ),
          predFastestLap: currentPrediction.fastestLap?.driverNumber ?? null,
          predFastestPitStop: currentPrediction.fastestPitStop?.driverNumber ?? null,
          predDriverOfTheDay: currentPrediction.driverOfTheDay?.driverNumber ?? null,
          resultTop10: currentResult.top10.map((d) => d.driverNumber),
          resultP11: currentResult.p11?.driverNumber ?? null,
          resultQualifyingTop3: currentResult.qualifyingTop3.map((d) => d.driverNumber),
          resultQualifyingP4: currentResult.qualifyingP4?.driverNumber ?? null,
          resultFastestLap: currentResult.fastestLap.driverNumber,
          resultFastestPitStop: currentResult.fastestPitStop?.driverNumber ?? -1,
          resultDriverOfTheDay: currentResult.driverOfTheDay?.driverNumber ?? null,
        })
      : null;

  const sprintMatchStatuses =
    currentSprintResult && currentSprintPred
      ? computeSprintMatchStatuses(currentSprintPred, currentSprintResult)
      : null;
  const sprintFieldPoints: SprintFieldPoints | null =
    currentSprintResult && currentSprintPred && currentSprintPred.status === "scored"
      ? computeSprintFieldPoints({
          predTop8: [
            currentSprintPred.sprintWinner?.driverNumber ?? null,
            ...currentSprintPred.restOfTop8.map((d) => d?.driverNumber ?? null),
          ],
          predQualifyingTop3: currentSprintPred.qualifyingTop3.map(
            (d) => d?.driverNumber ?? null
          ),
          predFastestLap: currentSprintPred.fastestLap?.driverNumber ?? null,
          resultTop8: currentSprintResult.top8.map((d) => d.driverNumber),
          resultP9: currentSprintResult.p9?.driverNumber ?? null,
          resultQualifyingTop3: currentSprintResult.qualifyingTop3.map((d) => d.driverNumber),
          resultQualifyingP4: currentSprintResult.qualifyingP4?.driverNumber ?? null,
          resultFastestLap: currentSprintResult.fastestLap.driverNumber,
        })
      : null;

  const raceBonusBadges: BonusBadge[] = raceFieldPoints
    ? buildBonusBadges([
        {
          perfect: raceFieldPoints.perfectPodiumBonus,
          match: raceFieldPoints.matchPodiumBonus,
          perfectLabel: t.predictionsPage.perfectPodiumBonus,
          matchLabel: t.predictionsPage.matchPodiumBonus,
        },
        {
          perfect: raceFieldPoints.perfectTop10Bonus,
          match: raceFieldPoints.matchTop10Bonus,
          perfectLabel: t.predictionsPage.perfectTop10Bonus,
          matchLabel: t.predictionsPage.matchTop10Bonus,
        },
        {
          perfect: raceFieldPoints.perfectQualifyingBonus,
          match: raceFieldPoints.matchQualifyingBonus,
          perfectLabel: t.predictionsPage.perfectQualifyingBonus,
          matchLabel: t.predictionsPage.matchQualifyingBonus,
        },
      ])
    : [];

  const sprintBonusBadges: BonusBadge[] = sprintFieldPoints
    ? buildBonusBadges([
        {
          perfect: sprintFieldPoints.perfectPodiumBonus,
          match: sprintFieldPoints.matchPodiumBonus,
          perfectLabel: t.predictionsPage.perfectPodiumBonus,
          matchLabel: t.predictionsPage.matchPodiumBonus,
        },
        {
          perfect: sprintFieldPoints.perfectTop8Bonus,
          match: sprintFieldPoints.matchTop8Bonus,
          perfectLabel: t.predictionsPage.perfectTop8Bonus,
          matchLabel: t.predictionsPage.matchTop8Bonus,
        },
        {
          perfect: sprintFieldPoints.perfectQualifyingBonus,
          match: sprintFieldPoints.matchQualifyingBonus,
          perfectLabel: t.predictionsPage.perfectQualifyingBonus,
          matchLabel: t.predictionsPage.matchQualifyingBonus,
        },
      ])
    : [];

  const activeResultExists = !isChampionTab && !!(tab === "sprint" ? currentSprintResult : currentResult);

  /* ── Slot helpers ─────────────────────────────────────────────────── */

  function getSlotLabel(slot: SlotTarget): string {
    switch (slot.kind) {
      case "qualifying":
      case "sprintQualifying":
        return `Q${slot.index + 1}`;
      case "winner":
        return t.predictionsPage.raceWinner;
      case "sprintWinner":
        return t.predictionsPage.sprintWinnerP1;
      case "rest":
      case "sprintRest":
        return `P${slot.index + 2}`;
      case "fastestLap":
      case "sprintFastestLap":
        return t.predictionsPage.fastestLap;
      case "fastestPitStop":
        return t.predictionsPage.fastestPitStop;
      case "driverOfTheDay":
        return t.predictionsPage.driverOfTheDay;
      case "champion":
        switch (slot.slot) {
          case "wdc":
            return t.predictionsPage.wdc;
          case "mostWins":
            return t.predictionsPage.mostWins;
          case "mostPodiums":
            return t.predictionsPage.mostPodiums;
          case "mostDnfs":
            return t.predictionsPage.mostDnfs;
        }
    }
  }

  function getSlotValue(slot: SlotTarget): Driver | null {
    switch (slot.kind) {
      case "qualifying":
        return currentPrediction?.qualifyingTop3[slot.index] ?? null;
      case "winner":
        return currentPrediction?.raceWinner ?? null;
      case "rest":
        return currentPrediction?.restOfTop10[slot.index] ?? null;
      case "fastestLap":
        return currentPrediction?.fastestLap ?? null;
      case "fastestPitStop":
        return currentPrediction?.fastestPitStop ?? null;
      case "driverOfTheDay":
        return currentPrediction?.driverOfTheDay ?? null;
      case "sprintQualifying":
        return currentSprintPred?.qualifyingTop3[slot.index] ?? null;
      case "sprintWinner":
        return currentSprintPred?.sprintWinner ?? null;
      case "sprintRest":
        return currentSprintPred?.restOfTop8[slot.index] ?? null;
      case "sprintFastestLap":
        return currentSprintPred?.fastestLap ?? null;
      case "champion":
        switch (slot.slot) {
          case "wdc":
            return champPred?.wdcWinner ?? null;
          case "mostWins":
            return champPred?.mostWinsDriver ?? null;
          case "mostPodiums":
            return champPred?.mostPodiumsDriver ?? null;
          case "mostDnfs":
            return champPred?.mostDnfsDriver ?? null;
        }
    }
  }

  function getDisabledForSlot(slot: SlotTarget): Driver[] {
    if (slot.kind === "qualifying" && currentPrediction) {
      return currentPrediction.qualifyingTop3.filter(
        (d, i): d is Driver => d !== null && i !== slot.index
      );
    }
    if (slot.kind === "sprintQualifying" && currentSprintPred) {
      return currentSprintPred.qualifyingTop3.filter(
        (d, i): d is Driver => d !== null && i !== slot.index
      );
    }
    if (slot.kind === "winner" && currentPrediction) {
      return currentPrediction.restOfTop10.filter((d): d is Driver => d !== null);
    }
    if (slot.kind === "sprintWinner" && currentSprintPred) {
      return currentSprintPred.restOfTop8.filter((d): d is Driver => d !== null);
    }
    if (slot.kind === "rest" && currentPrediction) {
      const used: Driver[] = [];
      if (currentPrediction.raceWinner) used.push(currentPrediction.raceWinner);
      currentPrediction.restOfTop10.forEach((d, i) => {
        if (d && i !== slot.index) used.push(d);
      });
      return used;
    }
    if (slot.kind === "sprintRest" && currentSprintPred) {
      const used: Driver[] = [];
      if (currentSprintPred.sprintWinner) used.push(currentSprintPred.sprintWinner);
      currentSprintPred.restOfTop8.forEach((d, i) => {
        if (d && i !== slot.index) used.push(d);
      });
      return used;
    }
    return []; // specials + champion picks may repeat drivers freely
  }

  function updateCurrentPrediction(update: Partial<FullRacePrediction>) {
    setPredictions((prev) =>
      prev
        ? prev.map((p) => (p.raceId === currentRace.meetingKey ? { ...p, ...update } : p))
        : prev
    );
  }

  function updateCurrentSprintPrediction(update: Partial<SprintPrediction>) {
    setSprintPreds((prev) =>
      prev
        ? prev.map((p) => (p.raceId === currentRace.meetingKey ? { ...p, ...update } : p))
        : prev
    );
  }

  function applySlot(slot: SlotTarget, driver: Driver | null) {
    switch (slot.kind) {
      case "qualifying": {
        if (!currentPrediction) return;
        const updated = [...currentPrediction.qualifyingTop3];
        updated[slot.index] = driver;
        updateCurrentPrediction({ qualifyingTop3: updated });
        break;
      }
      case "winner":
        updateCurrentPrediction({ raceWinner: driver });
        break;
      case "rest": {
        if (!currentPrediction) return;
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
      case "sprintQualifying": {
        if (!currentSprintPred) return;
        const updated = [...currentSprintPred.qualifyingTop3];
        updated[slot.index] = driver;
        updateCurrentSprintPrediction({ qualifyingTop3: updated });
        break;
      }
      case "sprintWinner":
        updateCurrentSprintPrediction({ sprintWinner: driver });
        break;
      case "sprintRest": {
        if (!currentSprintPred) return;
        const updated = [...currentSprintPred.restOfTop8];
        updated[slot.index] = driver;
        updateCurrentSprintPrediction({ restOfTop8: updated });
        break;
      }
      case "sprintFastestLap":
        updateCurrentSprintPrediction({ fastestLap: driver });
        break;
      case "champion":
        setChampPred((prev) => {
          if (!prev) return prev;
          switch (slot.slot) {
            case "wdc":
              return { ...prev, wdcWinner: driver };
            case "mostWins":
              return { ...prev, mostWinsDriver: driver };
            case "mostPodiums":
              return { ...prev, mostPodiumsDriver: driver };
            case "mostDnfs":
              return { ...prev, mostDnfsDriver: driver };
          }
        });
        break;
    }
  }

  /* ── Champion changed-field detection (for the half-points modal) ── */

  const changedChampionFields: string[] = (() => {
    if (!isChampionTab || !champPred || champPred.status !== "submitted") return [];
    const saved = savedChampPred.current;
    if (!saved) return [];
    const fields: string[] = [];
    if (champPred.wdcWinner?.driverNumber !== saved.wdcWinner?.driverNumber)
      fields.push(t.predictionsPage.wdc);
    if (champPred.wccWinner !== saved.wccWinner) fields.push(t.predictionsPage.wcc);
    if (champPred.mostDnfsDriver?.driverNumber !== saved.mostDnfsDriver?.driverNumber)
      fields.push(t.predictionsPage.mostDnfs);
    if (champPred.mostPodiumsDriver?.driverNumber !== saved.mostPodiumsDriver?.driverNumber)
      fields.push(t.predictionsPage.mostPodiums);
    if (champPred.mostWinsDriver?.driverNumber !== saved.mostWinsDriver?.driverNumber)
      fields.push(t.predictionsPage.mostWins);
    for (const curr of teamBestPreds ?? []) {
      const prev = savedTeamBestPreds.current?.find((p) => p.teamId === curr.teamId);
      if (curr.driverNumber !== prev?.driverNumber)
        fields.push(`${t.predictionsPage.teamBestDriver}: ${curr.teamName}`);
    }
    return fields;
  })();

  /* ── Submit / reset ───────────────────────────────────────────────── */

  async function invalidateActivePredictions() {
    if (isChampionTab) {
      await queryClient.invalidateQueries({ queryKey: ["championPrediction", userId] });
    } else if (tab === "sprint") {
      await queryClient.invalidateQueries({ queryKey: ["sprintPredictions", userId] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ["racePredictions", userId] });
    }
  }

  function buildSubmitPayload(): Record<string, unknown> | null {
    if (isChampionTab) {
      if (!champPred) return null;
      return {
        type: "champion",
        wdcDriverNumber: champPred.wdcWinner?.driverNumber ?? null,
        wccTeamName: champPred.wccWinner,
        mostDnfsDriverNumber: champPred.mostDnfsDriver?.driverNumber ?? null,
        mostPodiumsDriverNumber: champPred.mostPodiumsDriver?.driverNumber ?? null,
        mostWinsDriverNumber: champPred.mostWinsDriver?.driverNumber ?? null,
        teamBestDrivers: (teamBestPreds ?? [])
          .filter((p) => p.driverNumber !== null)
          .map((p) => ({ teamId: p.teamId, driverNumber: p.driverNumber! })),
      };
    }
    if (tab === "sprint") {
      if (!currentSprintPred) return null;
      return {
        type: "sprint",
        raceId: currentRace.meetingKey,
        qualifyingTop3: currentSprintPred.qualifyingTop3.map((d) => d?.driverNumber ?? null),
        top8: [
          currentSprintPred.sprintWinner?.driverNumber ?? null,
          ...currentSprintPred.restOfTop8.map((d) => d?.driverNumber ?? null),
        ],
        fastestLapDriverNumber: currentSprintPred.fastestLap?.driverNumber ?? null,
      };
    }
    if (!currentPrediction) return null;
    return {
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
  }

  async function handleSubmit() {
    if (isSaving) return;
    const payload = buildSubmitPayload();
    if (!payload) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch("/api/predictions/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setErrorMessage(data?.error || t.predictionsPage.submitError);
        return;
      }
      if (isChampionTab) {
        setChampPred((prev) => {
          if (!prev) return prev;
          const next = { ...prev, status: "submitted" as PredictionStatus };
          savedChampPred.current = next;
          return next;
        });
        savedTeamBestPreds.current = (teamBestPreds ?? []).map((p) => ({ ...p }));
      } else if (tab === "sprint") {
        updateCurrentSprintPrediction({ status: "submitted" });
      } else {
        updateCurrentPrediction({ status: "submitted" });
      }
      await invalidateActivePredictions();
    } catch {
      setErrorMessage(t.predictionsPage.submitError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    if (isSaving || isChampionTab) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload =
        tab === "sprint"
          ? { type: "sprint", raceId: currentRace.meetingKey }
          : { type: "race", raceId: currentRace.meetingKey };
      const res = await apiFetch("/api/predictions/reset", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setErrorMessage(data?.error || t.predictionsPage.resetError);
        return;
      }
      if (tab === "sprint") {
        updateCurrentSprintPrediction({
          qualifyingTop3: [null, null, null],
          sprintWinner: null,
          restOfTop8: Array.from({ length: 7 }, () => null),
          fastestLap: null,
          status: "pending",
        });
      } else {
        updateCurrentPrediction({
          qualifyingTop3: [null, null, null],
          raceWinner: null,
          restOfTop10: Array.from({ length: 9 }, () => null),
          fastestLap: null,
          fastestPitStop: null,
          driverOfTheDay: null,
          status: "pending",
        });
      }
      await invalidateActivePredictions();
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
        sprintPredictionsQuery.refetch(),
        teamsQuery.refetch(),
        championQuery.refetch(),
        raceResultsQuery.refetch(),
        sprintResultsQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  /* ── Submit button config (mirrors the web status → color mapping) ── */

  const status: PredictionStatus = isChampionTab
    ? (champPred?.status ?? "pending")
    : tab === "sprint"
      ? (currentSprintPred?.status ?? "pending")
      : (currentPrediction?.status ?? "pending");

  const submitConfig =
    status === "scored"
      ? { className: "bg-f1-white/10", textClassName: "text-f1-white/40", label: t.predictionsPage.scored, disabled: true }
      : status === "submitted" && !hasEdits
        ? { className: "bg-f1-blue active:bg-f1-blue/80", textClassName: "text-white", label: t.predictionsPage.submitted, disabled: false }
        : status === "submitted"
          ? { className: "bg-f1-amber active:bg-f1-amber/80", textClassName: "text-black", label: t.predictionsPage.updatePrediction, disabled: false }
          : { className: "bg-f1-green active:bg-f1-green/80", textClassName: "text-black", label: t.predictionsPage.submitPrediction, disabled: false };

  // Points shown in the actions bar: the combined weekend total on race/sprint
  // tabs of a sprint round (so both tabs agree), champion total on champion.
  const racePts = currentPrediction?.pointsEarned ?? null;
  const sprintPts = currentSprintPred?.pointsEarned ?? null;
  const weekendPts = currentRace.hasSprint
    ? racePts !== null || sprintPts !== null
      ? (racePts ?? 0) + (sprintPts ?? 0)
      : null
    : racePts;
  const pointsEarned = isChampionTab ? (champPred?.pointsEarned ?? null) : weekendPts;

  // Deadline handling for the actions bar: champion has no per-round deadline.
  const actionsLocked = isChampionTab ? championPhase === "closed" : deadlinePassed;

  // Update confirmation: race/sprint after a first submit; champion whenever
  // updates would earn half points (season started).
  const needsSubmitModal = isChampionTab ? seasonStarted : status === "submitted";

  const submitModalBody = isChampionTab
    ? champPred?.status !== "submitted"
      ? t.predictionsPage.championHalfPointsFirstNote
      : changedChampionFields.length > 0
        ? `${t.predictionsPage.championHalfPointsNote}\n${changedChampionFields
            .map((f) => `• ${f}`)
            .join("\n")}`
        : t.predictionsPage.updateConfirmBody
    : t.predictionsPage.updateConfirmBody;

  const pickerValue = pickerTarget ? getSlotValue(pickerTarget) : null;

  const championPending = teamsQuery.isPending || championQuery.isPending;
  const championError = teamsQuery.error ?? championQuery.error;
  const sprintPending = sprintPredictionsQuery.isPending;

  return (
    <ScreenShell>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#CF2637" />
        }
      >
        {/* ── Tabs ── */}
        <PredictionTabs
          tab={tab}
          hasSprint={currentRace.hasSprint}
          sprintNeedsAttention={sprintNeedsAttention}
          champNeedsAttention={champNeedsAttention}
          onChange={setTab}
        />

        {/* ── Round selector (race + sprint tabs) / champion header ── */}
        {!isChampionTab ? (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => selectRound(Math.max(0, raceIndex - 1))}
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
              onPress={() => selectRound(Math.min(races.length - 1, raceIndex + 1))}
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
        ) : (
          <View className="flex-row items-center gap-2 rounded-xl border border-f1-white/10 bg-f1-white/5 px-3 py-3">
            <Ionicons name="trophy" size={16} color="#FFB100" />
            <Text className="flex-1 text-sm font-semibold text-f1-white">
              {t.predictionsPage.championshipPredictions}
            </Text>
            {championPhase === "half" && (
              <View className="rounded-full bg-f1-amber/15 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-f1-amber">
                  {t.predictionsPage.championHalfPointsPhase}
                </Text>
              </View>
            )}
            {championPhase === "closed" && (
              <View className="rounded-full bg-f1-red/15 px-2 py-0.5">
                <Text className="text-[10px] font-semibold text-f1-red">
                  {t.predictionsPage.deadlinePassed}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Status row: badges + countdown / closed banner / results toggle ── */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            {!isChampionTab && <RaceStatusBadge status={raceStatus} />}
            <PredictionStatusBadge status={status} />
            {activeResultExists && (
              <Pressable
                onPress={() => setShowResults((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  showResults ? t.predictionsPage.hideResults : t.predictionsPage.showResults
                }
                className="ml-auto min-h-8 flex-row items-center gap-1.5 px-1"
              >
                <Ionicons name={showResults ? "eye-off" : "eye"} size={13} color="#3C91E6" />
                <Text className="text-xs font-medium text-f1-blue">
                  {showResults ? t.predictionsPage.hideResults : t.predictionsPage.showResults}
                </Text>
              </Pressable>
            )}
          </View>
          {!isChampionTab &&
            (!deadlinePassed ? (
              <CountdownBar
                deadline={activeDeadline}
                onExpire={() => {
                  const setter = tab === "sprint" ? setExpiredSprintKeys : setExpiredRaceKeys;
                  setter((prev) => new Set(prev).add(currentRace.meetingKey));
                }}
              />
            ) : (
              <View className="flex-row items-center gap-2 rounded-lg border border-f1-red/30 bg-f1-red/10 px-3 py-2">
                <Ionicons name="time-outline" size={14} color="#CF2637" />
                <Text className="text-xs font-semibold text-f1-red">
                  {t.predictionsPage.predictionsClosed}
                </Text>
              </View>
            ))}
        </View>

        {/* ── Results panel ── */}
        {showResults && !isChampionTab && tab === "race" && currentResult && (
          <RaceResultsPanel result={currentResult} />
        )}
        {showResults && tab === "sprint" && currentSprintResult && (
          <SprintResultsPanel result={currentSprintResult} />
        )}

        {/* ── Form ── */}
        {isChampionTab ? (
          championError ? (
            <View className="items-center gap-4 py-8">
              <Text className="text-center text-sm text-f1-white/70">
                {t.predictionsPage.loadError}
              </Text>
              <Pressable
                onPress={() => {
                  teamsQuery.refetch();
                  championQuery.refetch();
                }}
                accessibilityRole="button"
                accessibilityLabel={t.predictionsPage.retry}
                className="min-h-11 items-center justify-center rounded-lg bg-f1-red px-6 active:bg-f1-red-hover"
              >
                <Text className="font-semibold text-white">{t.predictionsPage.retry}</Text>
              </Pressable>
            </View>
          ) : championPending || !champPred || !teamBestPreds || !teamsWithDrivers ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#CF2637" />
            </View>
          ) : (
            <ChampionForm
              prediction={champPred}
              teamBestDriverPredictions={teamBestPreds}
              teamsWithDrivers={teamsWithDrivers}
              isEditable={isEditable}
              championPhase={championPhase}
              onPickDriver={(slot) => setPickerTarget({ kind: "champion", slot })}
              onPickTeam={() => setTeamPickerOpen(true)}
              onTeamBestDriverChange={(teamId, driverId, driverNumber) =>
                setTeamBestPreds((prev) =>
                  prev
                    ? prev.map((p) =>
                        p.teamId === teamId ? { ...p, driverId, driverNumber } : p
                      )
                    : prev
                )
              }
            />
          )
        ) : tab === "sprint" ? (
          sprintPending ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#CF2637" />
            </View>
          ) : currentSprintPred ? (
            <View className="gap-5">
              {/* Sprint qualifying top 3 */}
              <View className="gap-2">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/60">
                  {t.predictionsPage.qualifyingTop3}
                </Text>
                {currentSprintPred.qualifyingTop3.map((driver, i) => (
                  <DriverSlot
                    key={`sq-${i}`}
                    label={`Q${i + 1}`}
                    value={driver}
                    disabled={!isEditable}
                    matchStatus={sprintMatchStatuses?.qualifyingTop3[i] ?? null}
                    pointsAwarded={sprintFieldPoints?.qualifyingTop3[i] ?? null}
                    onPress={() => setPickerTarget({ kind: "sprintQualifying", index: i })}
                  />
                ))}
              </View>

              {/* Sprint winner */}
              <DriverSlot
                label={t.predictionsPage.sprintWinnerP1}
                value={currentSprintPred.sprintWinner}
                disabled={!isEditable}
                matchStatus={sprintMatchStatuses?.sprintWinner ?? null}
                pointsAwarded={sprintFieldPoints?.sprintWinner ?? null}
                onPress={() => setPickerTarget({ kind: "sprintWinner" })}
              />

              {/* Rest of top 8 */}
              <View className="gap-2">
                <Text className="text-[10px] font-semibold uppercase tracking-wider text-f1-white/60">
                  {t.predictionsPage.restOfTop8}
                </Text>
                {currentSprintPred.restOfTop8.map((driver, i) => (
                  <DriverSlot
                    key={`sp-${i}`}
                    label=""
                    position={i + 2}
                    value={driver}
                    disabled={!isEditable}
                    matchStatus={sprintMatchStatuses?.restOfTop8[i] ?? null}
                    pointsAwarded={sprintFieldPoints?.restOfTop8[i] ?? null}
                    onPress={() => setPickerTarget({ kind: "sprintRest", index: i })}
                  />
                ))}
              </View>

              {/* Fastest lap */}
              <DriverSlot
                label={t.predictionsPage.fastestLap}
                value={currentSprintPred.fastestLap}
                disabled={!isEditable}
                matchStatus={sprintMatchStatuses?.fastestLap ?? null}
                pointsAwarded={sprintFieldPoints?.fastestLap ?? null}
                onPress={() => setPickerTarget({ kind: "sprintFastestLap" })}
              />

              <BonusBadges badges={sprintBonusBadges} />
            </View>
          ) : (
            <Text className="py-8 text-center text-sm text-f1-white/50">
              {t.predictionsPage.noSprintPredictions}
            </Text>
          )
        ) : currentPrediction ? (
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
                  matchStatus={raceMatchStatuses?.qualifyingTop3[i] ?? null}
                  pointsAwarded={raceFieldPoints?.qualifyingTop3[i] ?? null}
                  onPress={() => setPickerTarget({ kind: "qualifying", index: i })}
                />
              ))}
            </View>

            {/* Race winner */}
            <DriverSlot
              label={t.predictionsPage.raceWinner}
              value={currentPrediction.raceWinner}
              disabled={!isEditable}
              matchStatus={raceMatchStatuses?.raceWinner ?? null}
              pointsAwarded={raceFieldPoints?.raceWinner ?? null}
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
                  matchStatus={raceMatchStatuses?.restOfTop10[i] ?? null}
                  pointsAwarded={raceFieldPoints?.restOfTop10[i] ?? null}
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
                matchStatus={raceMatchStatuses?.fastestLap ?? null}
                pointsAwarded={raceFieldPoints?.fastestLap ?? null}
                onPress={() => setPickerTarget({ kind: "fastestLap" })}
              />
              <DriverSlot
                label={t.predictionsPage.fastestPitStop}
                value={currentPrediction.fastestPitStop}
                disabled={!isEditable}
                matchStatus={raceMatchStatuses?.fastestPitStop ?? null}
                pointsAwarded={raceFieldPoints?.fastestPitStop ?? null}
                onPress={() => setPickerTarget({ kind: "fastestPitStop" })}
              />
              <DriverSlot
                label={t.predictionsPage.driverOfTheDay}
                value={currentPrediction.driverOfTheDay}
                disabled={!isEditable}
                matchStatus={raceMatchStatuses?.driverOfTheDay ?? null}
                pointsAwarded={raceFieldPoints?.driverOfTheDay ?? null}
                onPress={() => setPickerTarget({ kind: "driverOfTheDay" })}
              />
            </View>

            <BonusBadges badges={raceBonusBadges} />
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
            {pointsEarned !== null && (
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="trophy" size={16} color="#FFB100" />
                <Text className="text-base font-bold tabular-nums text-f1-amber">
                  {pointsEarned}
                </Text>
                <Text className="text-xs text-f1-white/50">{t.predictionsPage.ptsEarned}</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center gap-2">
            {isEditable && !isChampionTab && (
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
            {actionsLocked ? (
              <View className="min-h-11 flex-row items-center gap-1.5 rounded-lg bg-f1-red/15 px-4">
                <Ionicons name="time-outline" size={14} color="#CF2637" />
                <Text className="text-sm font-semibold text-f1-red">
                  {t.predictionsPage.deadlinePassed}
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  if (needsSubmitModal) {
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
          selectRound(i);
          setRoundPickerOpen(false);
        }}
        onClose={() => setRoundPickerOpen(false)}
      />

      <DriverPickerModal
        visible={pickerTarget !== null}
        label={pickerTarget ? getSlotLabel(pickerTarget) : ""}
        drivers={drivers}
        value={pickerValue}
        disabledDrivers={pickerTarget ? getDisabledForSlot(pickerTarget) : []}
        onSelect={(driver) => {
          if (pickerTarget) applySlot(pickerTarget, driver);
          setPickerTarget(null);
        }}
        onClose={() => setPickerTarget(null)}
      />

      <TeamPickerModal
        visible={teamPickerOpen}
        label={t.predictionsPage.wcc}
        teams={teamsWithDrivers ?? []}
        value={champPred?.wccWinner ?? null}
        onSelect={(teamName) => {
          setChampPred((prev) => (prev ? { ...prev, wccWinner: teamName } : prev));
          setTeamPickerOpen(false);
        }}
        onClose={() => setTeamPickerOpen(false)}
      />

      <ConfirmModal
        visible={showResetModal}
        title={t.predictionsPage.resetPrediction}
        subtitle={
          tab === "sprint"
            ? `${t.predictionsPage.sprint} — ${currentRace.raceName}`
            : currentRace.raceName
        }
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
        title={
          isChampionTab
            ? t.predictionsPage.championUpdateTitle
            : t.predictionsPage.updateConfirmTitle
        }
        subtitle={
          isChampionTab
            ? t.predictionsPage.championship
            : tab === "sprint"
              ? `${t.predictionsPage.sprint} — ${currentRace.raceName}`
              : currentRace.raceName
        }
        body={submitModalBody}
        confirmLabel={t.predictionsPage.confirmUpdate}
        confirmingLabel={t.predictionsPage.updating}
        tone={isChampionTab ? "amber" : "blue"}
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

/** Collapses each perfect/match bonus pair into at most one badge. */
function buildBonusBadges(
  pairs: { perfect: number; match: number; perfectLabel: string; matchLabel: string }[]
): BonusBadge[] {
  const badges: BonusBadge[] = [];
  for (const pair of pairs) {
    if (pair.perfect > 0) {
      badges.push({ label: pair.perfectLabel, points: pair.perfect, tone: "green" });
    } else if (pair.match > 0) {
      badges.push({ label: pair.matchLabel, points: pair.match, tone: "amber" });
    }
  }
  return badges;
}

/** Shared wrapper: dark background behind every screen state. The header
 * title comes from the tab navigator config in `(app)/_layout.tsx`. */
function ScreenShell({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 bg-f1-black">{children}</View>;
}
