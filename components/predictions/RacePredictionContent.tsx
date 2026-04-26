/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Zap,
  Flag,
  Clock,
  CheckCircle2,
  Circle,
  Send,
  RotateCcw,
  Info,
  Eye,
  EyeOff,
  Crown,
  MapPin,
  Loader2,
} from "lucide-react";
import { CountryFlag } from "@/components/ui/CountryFlag";
import type {
  Race,
  Driver,
  FullRacePrediction,
  SprintPrediction,
  ChampionPrediction,
  RaceResult,
  SprintResult,
  RaceStatus,
  TeamBestDriverPrediction,
  TeamWithDrivers,
} from "@/types";
import { getRaceStatus, getChampionPredictionPhase } from "@/lib/race-utils";
import type { ChampionPredictionPhase } from "@/lib/race-utils";
import {
  computeRaceFieldPoints,
  computeSprintFieldPoints,
  type RaceFieldPoints,
  type SprintFieldPoints,
} from "@/lib/scoring";
import { DriverSelect, type MatchStatus } from "./DriverSelect";
import { useLanguage } from "@/components/providers/LanguageProvider";

type TabMode = "race" | "sprint" | "champion";

interface RaceMatchStatuses {
  polePosition: MatchStatus;
  raceWinner: MatchStatus;
  restOfTop10: MatchStatus[];
  fastestLap: MatchStatus;
  fastestPitStop: MatchStatus;
  driverOfTheDay: MatchStatus;
}

interface SprintMatchStatuses {
  sprintPole: MatchStatus;
  sprintWinner: MatchStatus;
  restOfTop8: MatchStatus[];
  fastestLap: MatchStatus;
}

interface RacePredictionContentProps {
  races: Race[];
  drivers: Driver[];
  teams: string[];
  teamsWithDrivers: TeamWithDrivers[];
  predictions: FullRacePrediction[];
  sprintPredictions: SprintPrediction[];
  championPrediction: ChampionPrediction;
  teamBestDriverPredictions: TeamBestDriverPrediction[];
  raceResults: Record<number, RaceResult>;
  sprintResults: Record<number, SprintResult>;
  isOwner: boolean;
  displayName?: string;
  initialRaceIndex?: number;
  initialTab?: TabMode;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-f1-amber/15", text: "text-f1-amber", label: t.predictionsPage.pending },
    submitted: { bg: "bg-f1-blue/15", text: "text-f1-blue", label: t.predictionsPage.submitted },
    scored: { bg: "bg-f1-green/15", text: "text-f1-green", label: t.predictionsPage.scored },
  };
  const c = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.text}`}>
      {status === "scored" ? <CheckCircle2 size={10} /> : <Circle size={10} />}
      {c.label}
    </span>
  );
}

function RaceStatusBadge({ status }: { status: RaceStatus }) {
  const { t } = useLanguage();
  const config: Record<RaceStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    upcoming: { bg: "bg-f1-blue/15", text: "text-f1-blue", label: t.predictionsPage.upcoming, icon: <Clock size={10} /> },
    live: { bg: "bg-f1-red/15", text: "text-f1-red", label: t.predictionsPage.live, icon: <Zap size={10} /> },
    completed: { bg: "bg-f1-green/15", text: "text-f1-green", label: t.predictionsPage.completed, icon: <CheckCircle2 size={10} /> },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.bg} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

export function RacePredictionContent({
  races,
  drivers,
  teams,
  teamsWithDrivers,
  predictions: initialPredictions,
  sprintPredictions: initialSprintPredictions,
  championPrediction: initialChampionPrediction,
  teamBestDriverPredictions: initialTeamBestDriverPredictions,
  raceResults,
  sprintResults,
  isOwner,
  displayName,
  initialRaceIndex = 0,
  initialTab = "race",
}: RacePredictionContentProps) {
  const [raceIndex, setRaceIndex] = useState(initialRaceIndex);
  const [tab, setTab] = useState<TabMode>(initialTab);
  const [predictions, setPredictions] = useState(initialPredictions);
  const [sprintPreds, setSprintPreds] = useState(initialSprintPredictions);
  const [champPred, setChampPred] = useState(initialChampionPrediction);
  const [teamBestDriverPreds, setTeamBestDriverPreds] = useState(initialTeamBestDriverPredictions);
  const [showResults, setShowResults] = useState(false);

  const currentRace = races[raceIndex];
  const raceStatus = getRaceStatus(currentRace);
  const isChampionTab = tab === "champion";

  // Separate deadlines: sprint uses sprintDateEnd, race uses dateEnd
  const raceDeadline = currentRace.dateEnd;
  const sprintDeadline = currentRace.sprintDateEnd ?? currentRace.dateEnd;

  // The active deadline depends on the current tab
  const activeDeadline = tab === "sprint" ? sprintDeadline : raceDeadline;

  const [sprintDeadlinePassed, setSprintDeadlinePassed] = useState(
    () => new Date(sprintDeadline).getTime() <= Date.now()
  );
  const [raceDeadlinePassed, setRaceDeadlinePassed] = useState(
    () => new Date(raceDeadline).getTime() <= Date.now()
  );

  // For backward compat: qualifyingStarted = the active tab's deadline has passed
  const qualifyingStarted = tab === "sprint" ? sprintDeadlinePassed : raceDeadlinePassed;

  useEffect(() => {
    setSprintDeadlinePassed(new Date(sprintDeadline).getTime() <= Date.now());
    setRaceDeadlinePassed(new Date(raceDeadline).getTime() <= Date.now());
  }, [sprintDeadline, raceDeadline]);

  useEffect(() => {
    if (sprintDeadlinePassed && raceDeadlinePassed) return;
    const timer = setInterval(() => {
      if (!sprintDeadlinePassed && new Date(sprintDeadline).getTime() <= Date.now()) {
        setSprintDeadlinePassed(true);
      }
      if (!raceDeadlinePassed && new Date(raceDeadline).getTime() <= Date.now()) {
        setRaceDeadlinePassed(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sprintDeadline, raceDeadline, sprintDeadlinePassed, raceDeadlinePassed]);

  const nextRaceIndex = useMemo(() => {
    const now = new Date();
    for (let i = 0; i < races.length; i++) {
      if (new Date(races[i].dateEnd) > now) return i;
    }
    return -1;
  }, [races]);

  const championPhase: ChampionPredictionPhase = useMemo(() => {
    return getChampionPredictionPhase(races);
  }, [races]);

  // Champion tab is "open" (accepting submissions) when phase is full or half
  const isChampionOpen = championPhase !== "closed";

  // Season has started (for half-points logic) when phase is "half" or "closed"
  const seasonStarted = championPhase !== "full";

  // Always highlight the champion tab while it's open and not yet scored.
  const champNeedsAttention = championPhase === "full" && champPred.status !== "scored";

  const currentPrediction = predictions.find((p) => p.raceId === currentRace.meetingKey);
  const currentSprintPred = sprintPreds.find((p) => p.raceId === currentRace.meetingKey);
  const currentResult = raceResults[currentRace.meetingKey];
  const currentSprintResult = sprintResults[currentRace.meetingKey];

  const isEditable = isOwner && (
    isChampionTab
      ? champPred.status !== "scored" && isChampionOpen
      : tab === "sprint"
        ? currentSprintPred?.status !== "scored" && !qualifyingStarted
        : currentPrediction?.status !== "scored" && !qualifyingStarted
  );

  const hasEdits = useMemo(() => {
    if (isChampionTab) {
      return champPred.wdcWinner !== null || champPred.wccWinner !== null
        || champPred.mostDnfsDriver !== null || champPred.mostPodiumsDriver !== null || champPred.mostWinsDriver !== null
        || teamBestDriverPreds.some((p) => p.driverNumber !== null);
    }
    if (tab === "sprint" && currentSprintPred) {
      return currentSprintPred.sprintPole !== null || currentSprintPred.sprintWinner !== null || currentSprintPred.restOfTop8.some((d) => d !== null);
    }
    if (currentPrediction) {
      return currentPrediction.polePosition !== null || currentPrediction.raceWinner !== null || currentPrediction.restOfTop10.some((d) => d !== null);
    }
    return false;
  }, [isChampionTab, tab, champPred, currentSprintPred, currentPrediction, teamBestDriverPreds]);

  const { t, language } = useLanguage();

  const getSubmitButtonConfig = useCallback(() => {
    const status = isChampionTab
      ? champPred.status
      : tab === "sprint"
        ? currentSprintPred?.status ?? "pending"
        : currentPrediction?.status ?? "pending";

    if (status === "scored") return { color: "bg-muted/20 text-muted cursor-not-allowed", label: t.predictionsPage.scored };
    if (status === "submitted" && !hasEdits) return { color: "bg-f1-blue text-white", label: t.predictionsPage.submitted };
    if (status === "submitted") return { color: "bg-f1-amber text-black", label: t.predictionsPage.updatePrediction };
    return { color: "bg-f1-green text-black hover:bg-f1-green/80", label: t.predictionsPage.submitPrediction };
  }, [isChampionTab, tab, champPred, currentSprintPred, currentPrediction, hasEdits, t]);

  const submitConfig = getSubmitButtonConfig();

  const getDisabledForPosition = useCallback(
    (posIndex: number, mode: "race" | "sprint") => {
      if (mode === "race" && currentPrediction) {
        const used: Driver[] = [];
        if (currentPrediction.raceWinner) used.push(currentPrediction.raceWinner);
        currentPrediction.restOfTop10.forEach((d, i) => {
          if (d && i !== posIndex) used.push(d);
        });
        return used;
      }
      if (mode === "sprint" && currentSprintPred) {
        const used: Driver[] = [];
        if (currentSprintPred.sprintWinner) used.push(currentSprintPred.sprintWinner);
        currentSprintPred.restOfTop8.forEach((d, i) => {
          if (d && i !== posIndex) used.push(d);
        });
        return used;
      }
      return [];
    },
    [currentPrediction, currentSprintPred]
  );

  const getDisabledForWinner = useCallback(
    (mode: "race" | "sprint") => {
      if (mode === "race" && currentPrediction) {
        return currentPrediction.restOfTop10.filter((d): d is Driver => d !== null);
      }
      if (mode === "sprint" && currentSprintPred) {
        return currentSprintPred.restOfTop8.filter((d): d is Driver => d !== null);
      }
      return [];
    },
    [currentPrediction, currentSprintPred]
  );

  function updateRacePrediction(update: Partial<FullRacePrediction>) {
    setPredictions((prev) =>
      prev.map((p) =>
        p.raceId === currentRace.meetingKey ? { ...p, ...update } : p
      )
    );
  }

  function updateSprintPrediction(update: Partial<SprintPrediction>) {
    setSprintPreds((prev) =>
      prev.map((p) =>
        p.raceId === currentRace.meetingKey ? { ...p, ...update } : p
      )
    );
  }

  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Refs tracking the last successfully saved champion state (for changed-field detection)
  const savedChampPred = useRef(initialChampionPrediction);
  const savedTeamBestDriverPreds = useRef(initialTeamBestDriverPredictions);

  async function handleReset() {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = isChampionTab
        ? { type: "champion" }
        : tab === "sprint"
          ? { type: "sprint", raceId: currentRace.meetingKey }
          : { type: "race", raceId: currentRace.meetingKey };

      const res = await fetch("/api/predictions/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        const message = data?.error || "Failed to reset prediction. Please try again.";
        setErrorMessage(message);
        return;
      }

      if (isChampionTab) {
        setChampPred({
          ...champPred,
          wdcWinner: null,
          wccWinner: null,
          mostDnfsDriver: null,
          mostPodiumsDriver: null,
          mostWinsDriver: null,
          status: "pending",
          wdcPoints: 0,
          wccPoints: 0,
          mostDnfsPoints: 0,
          mostPodiumsPoints: 0,
          mostWinsPoints: 0,
        });
        setTeamBestDriverPreds((prev) => prev.map((p) => ({ ...p, driverId: null, driverNumber: null, status: "pending" as const })));
      } else if (tab === "sprint") {
        updateSprintPrediction({
          sprintPole: null,
          sprintWinner: null,
          restOfTop8: [null, null, null, null, null, null, null],
          fastestLap: null,
          status: "pending",
        });
      } else {
        updateRacePrediction({
          polePosition: null,
          raceWinner: null,
          restOfTop10: [null, null, null, null, null, null, null, null, null],
          fastestLap: null,
          fastestPitStop: null,
          driverOfTheDay: null,
          status: "pending",
        });
      }

      startTransition(() => router.refresh());
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      let payload: Record<string, unknown>;

      if (isChampionTab) {
        payload = {
          type: "champion",
          wdcDriverNumber: champPred.wdcWinner?.driverNumber ?? null,
          wccTeamName: champPred.wccWinner,
          mostDnfsDriverNumber: champPred.mostDnfsDriver?.driverNumber ?? null,
          mostPodiumsDriverNumber: champPred.mostPodiumsDriver?.driverNumber ?? null,
          mostWinsDriverNumber: champPred.mostWinsDriver?.driverNumber ?? null,
          teamBestDrivers: teamBestDriverPreds
            .filter((p) => p.driverNumber !== null)
            .map((p) => ({ teamId: p.teamId, driverNumber: p.driverNumber! })),
        };
      } else if (tab === "sprint" && currentSprintPred) {
        payload = {
          type: "sprint",
          raceId: currentRace.meetingKey,
          sprintPoleDriverNumber: currentSprintPred.sprintPole?.driverNumber ?? null,
          top8: [
            currentSprintPred.sprintWinner?.driverNumber ?? null,
            ...currentSprintPred.restOfTop8.map((d) => d?.driverNumber ?? null),
          ],
          fastestLapDriverNumber: currentSprintPred.fastestLap?.driverNumber ?? null,
        };
      } else if (currentPrediction) {
        payload = {
          type: "race",
          raceId: currentRace.meetingKey,
          polePositionDriverNumber: currentPrediction.polePosition?.driverNumber ?? null,
          top10: [
            currentPrediction.raceWinner?.driverNumber ?? null,
            ...currentPrediction.restOfTop10.map((d) => d?.driverNumber ?? null),
          ],
          fastestLapDriverNumber: currentPrediction.fastestLap?.driverNumber ?? null,
          fastestPitStopDriverNumber: currentPrediction.fastestPitStop?.driverNumber ?? null,
          driverOfTheDayDriverNumber: currentPrediction.driverOfTheDay?.driverNumber ?? null,
        };
      } else {
        return;
      }

      const res = await fetch("/api/predictions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({} as { error?: string }));
        const message = data?.error || "Failed to submit prediction. Please try again.";
        setErrorMessage(message);
        return;
      }

      if (isChampionTab) {
        setChampPred({ ...champPred, status: "submitted" });
        // Update saved-state refs so changed-field detection is correct on the next update
        savedChampPred.current = { ...champPred, status: "submitted" };
        savedTeamBestDriverPreds.current = teamBestDriverPreds.map((p) => ({ ...p }));
      } else if (tab === "sprint") {
        updateSprintPrediction({ status: "submitted" });
      } else {
        updateRacePrediction({ status: "submitted" });
      }

      startTransition(() => router.refresh());
    } finally {
      setIsSaving(false);
    }
  }

  const racePts = currentPrediction?.pointsEarned ?? null;
  const sprintPts = currentSprintPred?.pointsEarned ?? null;

  const pointsEarned = isChampionTab
    ? champPred.pointsEarned
    : tab === "sprint"
      ? sprintPts
      : currentRace.hasSprint
        ? racePts !== null || sprintPts !== null
          ? (racePts ?? 0) + (sprintPts ?? 0)
          : null
        : racePts;

  const changedChampionFields = useMemo((): string[] => {
    if (!isChampionTab || champPred.status !== "submitted") return [];
    const saved = savedChampPred.current;
    const fields: string[] = [];
    if (champPred.wdcWinner?.driverNumber !== saved.wdcWinner?.driverNumber)
      fields.push(t.predictionsPage.wdc);
    if (champPred.wccWinner !== saved.wccWinner)
      fields.push(t.predictionsPage.wcc);
    if (champPred.mostDnfsDriver?.driverNumber !== saved.mostDnfsDriver?.driverNumber)
      fields.push(t.predictionsPage.mostDnfs);
    if (champPred.mostPodiumsDriver?.driverNumber !== saved.mostPodiumsDriver?.driverNumber)
      fields.push(t.predictionsPage.mostPodiums);
    if (champPred.mostWinsDriver?.driverNumber !== saved.mostWinsDriver?.driverNumber)
      fields.push(t.predictionsPage.mostWins);
    teamBestDriverPreds.forEach((curr) => {
      const prev = savedTeamBestDriverPreds.current.find((p) => p.teamId === curr.teamId);
      if (curr.driverNumber !== prev?.driverNumber)
        fields.push(`${t.predictionsPage.teamBestDriver}: ${curr.teamName}`);
    });
    return fields;
  }, [isChampionTab, champPred, teamBestDriverPreds, t]);

  const teamColors = useMemo(() => {
    const map: Record<string, string> = {};
    drivers.forEach((d) => {
      if (!map[d.teamName]) map[d.teamName] = d.teamColor;
    });
    return map;
  }, [drivers]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const raceMatchStatuses = useMemo((): RaceMatchStatuses | null => {
    if (!currentResult || !currentPrediction) return null;
    const resultTop10Numbers = currentResult.top10.map((d) => d.driverNumber);

    function fieldStatus(predicted: Driver | null, actual: Driver): MatchStatus {
      if (!predicted) return null;
      if (predicted.driverNumber === actual.driverNumber) return "exact";
      return null;
    }

    function positionStatus(predicted: Driver | null, actualAtPos: Driver): MatchStatus {
      if (!predicted) return null;
      if (predicted.driverNumber === actualAtPos.driverNumber) return "exact";
      if (resultTop10Numbers.includes(predicted.driverNumber)) return "close";
      return "miss";
    }

    const restStatuses: MatchStatus[] = currentPrediction.restOfTop10.map((predicted, i) =>
      positionStatus(predicted, currentResult.top10[i + 1])
    );

    return {
      polePosition: fieldStatus(currentPrediction.polePosition, currentResult.polePosition),
      raceWinner: positionStatus(currentPrediction.raceWinner, currentResult.top10[0]),
      restOfTop10: restStatuses,
      fastestLap: fieldStatus(currentPrediction.fastestLap, currentResult.fastestLap),
      fastestPitStop: currentResult.fastestPitStop
        ? fieldStatus(currentPrediction.fastestPitStop, currentResult.fastestPitStop)
        : null,
      driverOfTheDay: currentResult.driverOfTheDay
        ? fieldStatus(currentPrediction.driverOfTheDay, currentResult.driverOfTheDay)
        : null,
    };
  }, [currentResult, currentPrediction]);

  const raceFieldPoints = useMemo((): RaceFieldPoints | null => {
    if (!currentResult || !currentPrediction || currentPrediction.status !== "scored") {
      return null;
    }
    const predTop10: (number | null)[] = [
      currentPrediction.raceWinner?.driverNumber ?? null,
      ...currentPrediction.restOfTop10.map((d) => d?.driverNumber ?? null),
    ];
    const resultTop10: number[] = currentResult.top10.map((d) => d.driverNumber);
    return computeRaceFieldPoints({
      predTop10,
      predPole: currentPrediction.polePosition?.driverNumber ?? null,
      predFastestLap: currentPrediction.fastestLap?.driverNumber ?? null,
      predFastestPitStop: currentPrediction.fastestPitStop?.driverNumber ?? null,
      predDriverOfTheDay: currentPrediction.driverOfTheDay?.driverNumber ?? null,
      resultTop10,
      resultPole: currentResult.polePosition.driverNumber,
      resultFastestLap: currentResult.fastestLap.driverNumber,
      resultFastestPitStop: currentResult.fastestPitStop?.driverNumber ?? -1,
      resultDriverOfTheDay: currentResult.driverOfTheDay?.driverNumber ?? null,
    });
  }, [currentResult, currentPrediction]);

  const sprintMatchStatuses = useMemo((): SprintMatchStatuses | null => {
    if (!currentSprintResult || !currentSprintPred) return null;
    const resultTop8Numbers = currentSprintResult.top8.map((d) => d.driverNumber);

    function fieldStatus(predicted: Driver | null, actual: Driver): MatchStatus {
      if (!predicted) return null;
      if (predicted.driverNumber === actual.driverNumber) return "exact";
      return null;
    }

    function positionStatus(predicted: Driver | null, actualAtPos: Driver): MatchStatus {
      if (!predicted) return null;
      if (predicted.driverNumber === actualAtPos.driverNumber) return "exact";
      if (resultTop8Numbers.includes(predicted.driverNumber)) return "close";
      return "miss";
    }

    const restStatuses: MatchStatus[] = currentSprintPred.restOfTop8.map((predicted, i) =>
      positionStatus(predicted, currentSprintResult.top8[i + 1])
    );

    return {
      sprintPole: fieldStatus(currentSprintPred.sprintPole, currentSprintResult.sprintPole),
      sprintWinner: positionStatus(currentSprintPred.sprintWinner, currentSprintResult.top8[0]),
      restOfTop8: restStatuses,
      fastestLap: fieldStatus(currentSprintPred.fastestLap, currentSprintResult.fastestLap),
    };
  }, [currentSprintResult, currentSprintPred]);

  const sprintFieldPoints = useMemo((): SprintFieldPoints | null => {
    if (!currentSprintResult || !currentSprintPred || currentSprintPred.status !== "scored") {
      return null;
    }
    const predTop8: (number | null)[] = [
      currentSprintPred.sprintWinner?.driverNumber ?? null,
      ...currentSprintPred.restOfTop8.map((d) => d?.driverNumber ?? null),
    ];
    const resultTop8: number[] = currentSprintResult.top8.map((d) => d.driverNumber);
    return computeSprintFieldPoints({
      predTop8,
      predSprintPole: currentSprintPred.sprintPole?.driverNumber ?? null,
      predFastestLap: currentSprintPred.fastestLap?.driverNumber ?? null,
      resultTop8,
      resultSprintPole: currentSprintResult.sprintPole.driverNumber,
      resultFastestLap: currentSprintResult.fastestLap.driverNumber,
    });
  }, [currentSprintResult, currentSprintPred]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* Header: back button + user identification */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 sm:px-5">
        <a
          href="/leaderboard"
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-f1-white"
        >
          <ChevronLeft size={14} />
          {t.predictionsPage.backToLeaderboard}
        </a>
        {displayName && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-f1-red" />
            {isOwner ? (
              <span className="font-medium text-f1-white">{displayName}</span>
            ) : (
              <span>{displayName}{t.predictionsPage.yourPredictions}</span>
            )}
          </span>
        )}
      </div>

      {/* Round selector + race info (fused) — or champion header */}
      {isChampionTab ? (
        <>
          <RoundSelectorBar
            races={races}
            raceIndex={raceIndex}
            isChampionTab
            nextRaceIndex={nextRaceIndex}
            champNeedsAttention={champNeedsAttention}
            currentRace={currentRace}
            raceStatus={raceStatus}
            formatDate={formatDate}
            onSelectRound={(i) => {
              setRaceIndex(i);
              setTab("race");
            }}
            onPrev={() => {
              setTab("race");
              setRaceIndex(races.length - 1);
            }}
            onNext={() => {
              /* champion is the rightmost; no-op */
            }}
            onSelectChampion={() => setTab("champion")}
          />
          <ChampionHeader championPhase={championPhase} />
        </>
      ) : (
        <RoundSelectorBar
          races={races}
          raceIndex={raceIndex}
          isChampionTab={false}
          nextRaceIndex={nextRaceIndex}
          champNeedsAttention={champNeedsAttention}
          currentRace={currentRace}
          raceStatus={raceStatus}
          formatDate={formatDate}
          onSelectRound={(i) => {
            setRaceIndex(i);
            if (tab === "sprint" && !races[i].hasSprint) setTab("race");
          }}
          onPrev={() => {
            if (raceIndex > 0) {
              setRaceIndex(raceIndex - 1);
              setTab("race");
            }
          }}
          onNext={() => {
            if (raceIndex < races.length - 1) {
              setRaceIndex(raceIndex + 1);
              setTab("race");
            } else {
              setTab("champion");
            }
          }}
          onSelectChampion={() => setTab("champion")}
        />
      )}

      {/* Race/Sprint Toggle (only for race tabs with sprint) */}
      {!isChampionTab && (
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("race")}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
              tab === "race"
                ? "border-b-2 border-f1-red text-f1-white"
                : "text-muted hover:text-f1-white"
            }`}
          >
            <Flag size={12} />
            {t.predictionsPage.race}
          </button>
          <button
            onClick={() => currentRace.hasSprint && setTab("sprint")}
            disabled={!currentRace.hasSprint}
            className={`relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
              tab === "sprint"
                ? "border-b-2 border-f1-red text-f1-white"
                : !currentRace.hasSprint
                  ? "cursor-not-allowed text-muted/30"
                  : "text-muted hover:text-f1-white"
            } ${
              currentRace.hasSprint && tab !== "sprint" && !sprintDeadlinePassed && currentSprintPred?.status !== "scored"
                ? "animate-pulse bg-f1-purple/10"
                : ""
            }`}
          >
            <Zap size={12} className={
              currentRace.hasSprint && tab !== "sprint" && !sprintDeadlinePassed && currentSprintPred?.status !== "scored"
                ? "text-f1-purple"
                : ""
            } />
            {t.predictionsPage.sprint}
            {currentRace.hasSprint && tab !== "sprint" && !sprintDeadlinePassed && currentSprintPred?.status !== "scored" && (
              <span className="absolute -top-0.5 -right-2 h-1.5 w-1.5 rounded-full bg-f1-purple animate-pulse" />
            )}
            {!currentRace.hasSprint && (
              <span className="text-[9px] text-muted/30">{t.predictionsPage.na}</span>
            )}
          </button>
        </div>
      )}

      {/* Status row: countdown (upcoming), predictions-closed banner, and/or
          show-results toggle (completed). The same horizontal slot serves all
          three states so the layout stays consistent across race phases. */}
      {!isChampionTab && (() => {
        const showCountdown = raceStatus !== "completed" && !qualifyingStarted;
        const showClosedBanner = qualifyingStarted && raceStatus !== "completed";
        const hasResultsData = !!currentResult || !!currentSprintResult;
        const showResultsToggle = raceStatus === "completed" || hasResultsData;
        if (!showCountdown && !showClosedBanner && !showResultsToggle) return null;
        return (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-5">
            {showResultsToggle ? (
              <button
                onClick={() => setShowResults(!showResults)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-f1-blue transition-colors hover:text-f1-blue/80"
              >
                {showResults ? <EyeOff size={12} /> : <Eye size={12} />}
                {showResults ? t.predictionsPage.hideResults : t.predictionsPage.showResults}
              </button>
            ) : (
              <span aria-hidden />
            )}
            {showCountdown && <DeadlineCountdown deadline={activeDeadline} />}
            {showClosedBanner && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-f1-red/10 px-2 py-1 text-[11px] font-semibold text-f1-red">
                <Clock size={12} />
                {t.predictionsPage.predictionsClosed}
              </span>
            )}
          </div>
        );
      })()}

      {/* Results Display */}
      {showResults && !isChampionTab && tab === "race" && currentResult && (
        <ResultsDisplay result={currentResult} type="race" />
      )}
      {showResults && !isChampionTab && tab === "sprint" && currentSprintResult && (
        <SprintResultsDisplay result={currentSprintResult} />
      )}

      {/* Prediction Form */}
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        {isChampionTab ? (
          <ChampionForm
            prediction={champPred}
            drivers={drivers}
            teams={teams}
            teamsWithDrivers={teamsWithDrivers}
            teamBestDriverPredictions={teamBestDriverPreds}
            teamColors={teamColors}
            isEditable={isEditable}
            championPhase={championPhase}
            onChange={setChampPred}
            onTeamBestDriverChange={setTeamBestDriverPreds}
          />
        ) : tab === "sprint" ? (
          currentSprintPred ? (
            <SprintForm
              prediction={currentSprintPred}
              drivers={drivers}
              isEditable={isEditable}
              getDisabledForPosition={(i) => getDisabledForPosition(i, "sprint")}
              getDisabledForWinner={() => getDisabledForWinner("sprint")}
              onChange={(update) => updateSprintPrediction(update)}
              matchStatuses={sprintMatchStatuses}
              fieldPoints={sprintFieldPoints}
            />
          ) : (
            <p className="py-8 text-center text-xs text-muted">
              {t.predictionsPage.noSprintPredictions}
            </p>
          )
        ) : currentPrediction ? (
          <RaceForm
            prediction={currentPrediction}
            drivers={drivers}
            isEditable={isEditable}
            getDisabledForPosition={(i) => getDisabledForPosition(i, "race")}
            getDisabledForWinner={() => getDisabledForWinner("race")}
            onChange={(update) => updateRacePrediction(update)}
            matchStatuses={raceMatchStatuses}
            fieldPoints={raceFieldPoints}
          />
        ) : (
          <p className="py-8 text-center text-xs text-muted">
            {t.predictionsPage.noPredictions}
          </p>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 border-t border-f1-red/30 bg-f1-red/10 px-4 py-2.5 sm:px-5">
          <span className="text-[11px] font-medium text-f1-red">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-[10px] text-f1-red/60 hover:text-f1-red"
          >
            {t.predictionsPage.dismiss}
          </button>
        </div>
      )}

      {/* Points & Actions Bar */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          {pointsEarned !== null && (
            <div className="flex items-center gap-1.5">
              <Trophy size={14} className="text-f1-amber" />
              <span className="text-sm font-bold tabular-nums text-f1-amber">
                {pointsEarned}
              </span>
              <span className="text-[10px] text-muted">{t.predictionsPage.ptsEarned}</span>
            </div>
          )}
          <StatusBadge
            status={
              isChampionTab
                ? champPred.status
                : tab === "sprint"
                  ? currentSprintPred?.status ?? "pending"
                  : currentPrediction?.status ?? "pending"
            }
          />
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            {isEditable && !isChampionTab && (
              <button
                onClick={() => setShowResetModal(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-50"
              >
                <RotateCcw size={12} />
                {t.predictionsPage.reset}
              </button>
            )}
            {!isChampionTab && qualifyingStarted ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-f1-red/15 px-4 py-1.5 text-[11px] font-semibold text-f1-red">
                <Clock size={12} />
                {t.predictionsPage.deadlinePassed}
              </span>
            ) : (
              <button
                onClick={() => {
                  const needsModal =
                    (isChampionTab && seasonStarted) ||
                    (!isChampionTab &&
                      (tab === "sprint"
                        ? currentSprintPred?.status === "submitted"
                        : currentPrediction?.status === "submitted"));
                  if (needsModal) {
                    setShowSubmitModal(true);
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={!isEditable || isSaving}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[11px] font-semibold transition-colors ${submitConfig.color} ${isSaving ? "opacity-70" : ""}`}
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {isSaving ? t.predictionsPage.saving : submitConfig.label}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <ResetConfirmModal
          tab={tab}
          raceName={isChampionTab ? undefined : currentRace.raceName}
          isSaving={isSaving}
          onConfirm={() => {
            setShowResetModal(false);
            handleReset();
          }}
          onCancel={() => setShowResetModal(false)}
        />
      )}

      {showSubmitModal && (
        <SubmitConfirmModal
          tab={tab}
          raceName={isChampionTab ? undefined : currentRace.raceName}
          isChampionHalfPoints={isChampionTab && seasonStarted}
          isFirstChampionSubmit={champPred.status !== "submitted"}
          changedFields={changedChampionFields}
          isSaving={isSaving}
          onConfirm={() => {
            setShowSubmitModal(false);
            handleSubmit();
          }}
          onCancel={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  );
}

/* ---------- Reset Confirmation Modal ---------- */

function ResetConfirmModal({
  tab,
  raceName,
  isSaving,
  onConfirm,
  onCancel,
}: {
  tab: TabMode;
  raceName?: string;
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const label =
    tab === "champion"
      ? t.predictionsPage.championship
      : tab === "sprint"
        ? `${t.predictionsPage.sprint} — ${raceName}`
        : raceName ?? t.predictionsPage.race;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-f1-red/15">
            <RotateCcw size={15} className="text-f1-red" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-f1-white">{t.predictionsPage.resetPrediction}</h2>
            <p className="mt-0.5 text-[11px] text-muted">{label}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-xs leading-relaxed text-muted">
            {t.predictionsPage.resetBody}{" "}
            <span className="font-medium text-f1-white">{t.predictionsPage.resetBodyPending}</span>
            {t.predictionsPage.resetBodySuffix}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-50"
          >
            {t.navbar.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-f1-red px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-f1-red/80 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            {isSaving ? t.predictionsPage.resetting : t.predictionsPage.resetConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Submit / Update Confirmation Modal ---------- */

function SubmitConfirmModal({
  tab,
  raceName,
  isChampionHalfPoints,
  isFirstChampionSubmit,
  changedFields,
  isSaving,
  onConfirm,
  onCancel,
}: {
  tab: TabMode;
  raceName?: string;
  isChampionHalfPoints: boolean;
  isFirstChampionSubmit: boolean;
  changedFields: string[];
  isSaving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();

  const label =
    tab === "champion"
      ? t.predictionsPage.championship
      : tab === "sprint"
        ? `${t.predictionsPage.sprint} — ${raceName}`
        : raceName ?? t.predictionsPage.race;

  const isChampionModal = isChampionHalfPoints;
  const title = isChampionModal
    ? t.predictionsPage.championUpdateTitle
    : t.predictionsPage.updateConfirmTitle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isChampionModal ? "bg-f1-amber/15" : "bg-f1-blue/15"
            }`}
          >
            {isChampionModal ? (
              <Crown size={15} className="text-f1-amber" />
            ) : (
              <Send size={15} className="text-f1-blue" />
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-f1-white">{title}</h2>
            <p className="mt-0.5 text-[11px] text-muted">{label}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {isChampionModal ? (
            isFirstChampionSubmit ? (
              <p className="text-xs leading-relaxed text-muted">
                {t.predictionsPage.championHalfPointsFirstNote}
              </p>
            ) : changedFields.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-muted">
                  {t.predictionsPage.championHalfPointsNote}
                </p>
                <ul className="space-y-1.5">
                  {changedFields.map((field) => (
                    <li key={field} className="flex items-center gap-2 text-xs">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-f1-amber" />
                      <span className="font-medium text-f1-white">{field}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-muted">
                {t.predictionsPage.updateConfirmBody}
              </p>
            )
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              {t.predictionsPage.updateConfirmBody}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-50"
          >
            {t.navbar.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[11px] font-semibold text-white transition-colors disabled:opacity-50 ${
              isChampionModal
                ? "bg-f1-amber text-black hover:bg-f1-amber/80"
                : "bg-f1-blue hover:bg-f1-blue/80"
            }`}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {isSaving ? t.predictionsPage.updating : t.predictionsPage.confirmUpdate}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Race Info Bar ---------- */

/* ---------- Round Selector Bar (fused round picker + race info + countdown) ---------- */

interface RoundSelectorBarProps {
  races: Race[];
  raceIndex: number;
  isChampionTab: boolean;
  nextRaceIndex: number;
  champNeedsAttention: boolean;
  currentRace: Race;
  raceStatus: RaceStatus;
  formatDate: (d: string) => string;
  onSelectRound: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectChampion: () => void;
}

function RoundSelectorBar({
  races,
  raceIndex,
  isChampionTab,
  nextRaceIndex,
  champNeedsAttention,
  currentRace,
  raceStatus,
  formatDate,
  onSelectRound,
  onPrev,
  onNext,
  onSelectChampion,
}: RoundSelectorBarProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(raceIndex);
  const listboxRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // The championship option lives at the end of the listbox.
  const championshipIndex = races.length;
  const lastIndex = championshipIndex; // total options - 1

  // Keep activeIndex aligned with selection when the dropdown opens.
  useEffect(() => {
    if (open) setActiveIndex(isChampionTab ? championshipIndex : raceIndex);
  }, [open, raceIndex, isChampionTab, championshipIndex]);

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open]);

  // Scroll the active option into view as the user navigates.
  useEffect(() => {
    if (!open || !listboxRef.current) return;
    const el = listboxRef.current.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  // Move focus into the listbox when it opens so keyboard navigation works.
  useEffect(() => {
    if (open) listboxRef.current?.focus();
  }, [open]);

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  };

  const commitSelection = (index: number) => {
    if (index === championshipIndex) {
      onSelectChampion();
    } else {
      onSelectRound(index);
    }
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(lastIndex, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(lastIndex);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      commitSelection(activeIndex);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  // Which round to display in the chip — when on champion tab the chip shows
  // "Championship" instead of the round/race name.
  const chipRace = currentRace;

  return (
    <div
      ref={containerRef}
      className="border-b border-border px-4 py-4 sm:px-5"
    >
      {/* Top row: prev arrow · round chip + dropdown · champion pill · status pill · next arrow */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onPrev}
          disabled={!isChampionTab && raceIndex === 0}
          aria-label={t.predictionsPage.previousRound}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Round chip + listbox dropdown */}
        <div className="relative min-w-0 flex-1">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            onKeyDown={onTriggerKeyDown}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={
              isChampionTab
                ? `${t.predictionsPage.roundSelectorLabel}: ${t.predictionsPage.championship}`
                : `${t.predictionsPage.roundSelectorLabel}: R${chipRace.round} ${chipRace.raceName}`
            }
            className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-f1-white transition-colors hover:border-border-hover"
          >
            {isChampionTab ? (
              <>
                <Crown size={14} className="shrink-0 text-f1-amber" />
                <span className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate text-left">
                  <span className="truncate text-xs font-semibold">
                    {t.predictionsPage.championship}
                  </span>
                </span>
              </>
            ) : (
              <>
                <CountryFlag
                  countryCode={chipRace.countryCode}
                  className="inline-block h-3.5 w-5 rounded-[1px] shrink-0"
                />
                <span className="flex min-w-0 flex-1 items-baseline gap-1.5 truncate text-left">
                  <span className="text-[11px] font-mono text-muted shrink-0">
                    R{String(chipRace.round).padStart(2, "0")}
                  </span>
                  <span className="truncate text-xs font-semibold">
                    {chipRace.raceName}
                  </span>
                </span>
              </>
            )}
            <ChevronDown
              size={14}
              className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>

          {open && (
            <ul
              ref={listboxRef}
              role="listbox"
              tabIndex={-1}
              aria-label={t.predictionsPage.jumpToRound}
              aria-activedescendant={
                activeIndex === championshipIndex
                  ? "round-option-championship"
                  : `round-option-${activeIndex}`
              }
              onKeyDown={onListKeyDown}
              className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-xl focus:outline-none"
            >
              {races.map((race, i) => {
                const isSelected = !isChampionTab && i === raceIndex;
                const isActive = i === activeIndex;
                const isNext = i === nextRaceIndex;
                return (
                  <li
                    key={race.meetingKey}
                    id={`round-option-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commitSelection(i)}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors ${
                      isActive ? "bg-card-hover" : ""
                    } ${isSelected ? "border-l-2 border-f1-red" : "border-l-2 border-transparent"}`}
                  >
                    <CountryFlag
                      countryCode={race.countryCode}
                      className="inline-block h-3.5 w-5 rounded-[1px] shrink-0"
                    />
                    <span className="text-[10px] font-mono text-muted shrink-0">
                      R{String(race.round).padStart(2, "0")}
                    </span>
                    <span className="flex-1 truncate text-xs text-f1-white">
                      {race.raceName}
                    </span>
                    {isNext && (
                      <span className="rounded-full bg-f1-red/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-f1-red">
                        {t.predictionsPage.upcoming}
                      </span>
                    )}
                  </li>
                );
              })}

              {/* Divider + Championship option (always last) */}
              <li role="separator" aria-hidden className="my-1 border-t border-border" />
              <li
                id="round-option-championship"
                data-index={championshipIndex}
                role="option"
                aria-selected={isChampionTab}
                onMouseEnter={() => setActiveIndex(championshipIndex)}
                onClick={() => commitSelection(championshipIndex)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors ${
                  activeIndex === championshipIndex ? "bg-card-hover" : ""
                } ${isChampionTab ? "border-l-2 border-f1-amber" : "border-l-2 border-transparent"}`}
              >
                <Crown size={14} className="shrink-0 text-f1-amber" />
                <span className="flex-1 truncate text-xs font-semibold text-f1-white">
                  {t.predictionsPage.championship}
                </span>
                {champNeedsAttention && !isChampionTab && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-f1-amber"
                    aria-hidden
                  />
                )}
              </li>
            </ul>
          )}
        </div>

        {/* Champion pill — separate from rounds */}
        <button
          type="button"
          onClick={onSelectChampion}
          aria-pressed={isChampionTab}
          aria-label={t.predictionsPage.championPrediction}
          className={`relative flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors sm:px-2.5 ${
            isChampionTab
              ? "bg-f1-amber text-black"
              : champNeedsAttention
                ? "bg-f1-amber/15 text-f1-amber ring-1 ring-f1-amber/40"
                : "border border-border text-muted hover:border-border-hover hover:text-f1-white"
          }`}
        >
          {champNeedsAttention && !isChampionTab && (
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-f1-amber animate-pulse" aria-hidden />
          )}
          <Crown size={12} />
          <span className="hidden sm:inline">{t.predictionsPage.champion}</span>
        </button>

        {/* Race status pill (only on race tab) */}
        {!isChampionTab && (
          <div className="hidden shrink-0 sm:block">
            <RaceStatusBadge status={raceStatus} />
          </div>
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={isChampionTab}
          aria-label={t.predictionsPage.nextRound}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Mobile-only status pill row */}
      {!isChampionTab && (
        <div className="mt-2 flex items-center gap-2 sm:hidden">
          <RaceStatusBadge status={raceStatus} />
        </div>
      )}

      {/* Race meta: location · date range · R{round} pill */}
      {!isChampionTab && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">
              {currentRace.location}, {currentRace.countryName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] tabular-nums text-muted">
              {formatDate(currentRace.dateStart)} – {formatDate(currentRace.dateEnd)}
            </span>
            <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted">
              R{currentRace.round}
            </span>
          </div>
        </div>
      )}

    </div>
  );
}

/* ---------- Deadline Countdown (compact, shown in the results-toggle row) ---------- */

function computeTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const { t, language } = useLanguage();
  const [timeLeft, setTimeLeft] = useState(() => computeTimeLeft(deadline));

  useEffect(() => {
    // Reset immediately when the deadline prop changes, then tick every second.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeLeft(computeTimeLeft(deadline));
    const timer = setInterval(() => {
      setTimeLeft(computeTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const numeric = `${pad(timeLeft.days)}:${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;

  // Human-readable announcement for screen readers.
  const announce =
    language === "es"
      ? `${timeLeft.days} días, ${timeLeft.hours} horas, ${timeLeft.minutes} minutos`
      : `${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes`;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={t.predictionsPage.predictionDeadline}
      className="flex items-center gap-1.5"
    >
      <Clock size={12} className="text-f1-amber" />
      <span className="text-[11px] font-medium tracking-wider text-muted">
        {t.predictionsPage.predictionDeadline}
      </span>
      <span className="text-[11px] font-semibold tabular-nums text-f1-white">
        {numeric}
      </span>
      <span className="sr-only" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}

/* ---------- Champion Header ---------- */

function ChampionHeader({ championPhase }: { championPhase: ChampionPredictionPhase }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      {/* Transparent backdrop — closes the popover when tapping outside on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-f1-amber" />
          <h2 className="text-sm font-semibold text-f1-white">
            {t.predictionsPage.championshipPredictions}
          </h2>
          {championPhase === "closed" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-f1-red/15 px-2 py-0.5 text-[10px] font-semibold text-f1-red">
              {t.predictionsPage.deadlinePassed}
            </span>
          )}
          {championPhase === "half" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-f1-amber/15 px-2 py-0.5 text-[10px] font-semibold text-f1-amber">
              {t.predictionsPage.championHalfPointsPhase}
            </span>
          )}
        </div>
        <div className="group relative">
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-label="Championship info"
            className="flex items-center justify-center"
          >
            <Info size={14} className="cursor-help text-f1-amber animate-pulse" />
          </button>
          <div
            className={`absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-xl transition-opacity ${
              isOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
            }`}
          >
            <div className="space-y-2">
              <p className="text-[11px] leading-relaxed text-muted">
                {t.predictionsPage.championshipInfoPhase1}
              </p>
              <p className="text-[11px] leading-relaxed text-muted">
                {t.predictionsPage.championshipInfoPhase2Pre}{" "}
                <span className="font-semibold text-f1-amber">{t.predictionsPage.championshipInfoHalfPoints}</span>
                {t.predictionsPage.championshipInfoPhase2Post}
              </p>
              <p className="text-[11px] leading-relaxed text-muted">
                {t.predictionsPage.championshipInfoPhase3Pre}{" "}
                <span className="font-semibold text-f1-white">{t.predictionsPage.championshipInfoSummerBreak}</span>
                {" "}{t.predictionsPage.championshipInfoPhase3Post}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Race Form ---------- */

function RaceForm({
  prediction,
  drivers,
  isEditable,
  getDisabledForPosition,
  getDisabledForWinner,
  onChange,
  matchStatuses,
  fieldPoints,
}: {
  prediction: FullRacePrediction;
  drivers: Driver[];
  isEditable: boolean;
  getDisabledForPosition: (i: number) => Driver[];
  getDisabledForWinner: () => Driver[];
  onChange: (update: Partial<FullRacePrediction>) => void;
  matchStatuses: RaceMatchStatuses | null;
  fieldPoints: RaceFieldPoints | null;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DriverSelect
          label={t.predictionsPage.polePosition}
          value={prediction.polePosition}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ polePosition: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.polePosition}
          pointsAwarded={fieldPoints?.polePosition ?? null}
        />
        <DriverSelect
          label={t.predictionsPage.raceWinner}
          value={prediction.raceWinner}
          drivers={drivers}
          disabledDrivers={getDisabledForWinner()}
          onChange={(d) => onChange({ raceWinner: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.raceWinner}
          pointsAwarded={fieldPoints?.raceWinner ?? null}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t.predictionsPage.restOfTop10}
          </span>
          <span className="text-[9px] text-muted/50">{t.predictionsPage.restOfTop10Sub}</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {prediction.restOfTop10.map((driver, i) => (
            <DriverSelect
              key={i}
              label=""
              position={i + 2}
              value={driver}
              drivers={drivers}
              disabledDrivers={getDisabledForPosition(i)}
              onChange={(d) => {
                const updated = [...prediction.restOfTop10];
                updated[i] = d;
                onChange({ restOfTop10: updated });
              }}
              disabled={!isEditable}
              matchStatus={matchStatuses?.restOfTop10[i]}
              pointsAwarded={fieldPoints?.restOfTop10[i] ?? null}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DriverSelect
          label={t.predictionsPage.fastestLap}
          value={prediction.fastestLap}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ fastestLap: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.fastestLap}
          pointsAwarded={fieldPoints?.fastestLap ?? null}
        />
        <DriverSelect
          label={t.predictionsPage.fastestPitStop}
          value={prediction.fastestPitStop}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ fastestPitStop: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.fastestPitStop}
          pointsAwarded={fieldPoints?.fastestPitStop ?? null}
        />
        <DriverSelect
          label={t.predictionsPage.driverOfTheDay}
          value={prediction.driverOfTheDay}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ driverOfTheDay: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.driverOfTheDay}
          pointsAwarded={fieldPoints?.driverOfTheDay ?? null}
        />
      </div>

      {fieldPoints && (
        <BonusBadges
          badges={[
            fieldPoints.perfectPodiumBonus > 0
              ? { label: t.predictionsPage.perfectPodiumBonus, points: fieldPoints.perfectPodiumBonus, tone: "green" as const }
              : fieldPoints.matchPodiumBonus > 0
                ? { label: t.predictionsPage.matchPodiumBonus, points: fieldPoints.matchPodiumBonus, tone: "amber" as const }
                : null,
            fieldPoints.perfectTop10Bonus > 0
              ? { label: t.predictionsPage.perfectTop10Bonus, points: fieldPoints.perfectTop10Bonus, tone: "green" as const }
              : fieldPoints.matchTop10Bonus > 0
                ? { label: t.predictionsPage.matchTop10Bonus, points: fieldPoints.matchTop10Bonus, tone: "amber" as const }
                : null,
          ].filter((b): b is { label: string; points: number; tone: "green" | "amber" } => b !== null)}
        />
      )}
    </div>
  );
}

/* ---------- Sprint Form ---------- */

function SprintForm({
  prediction,
  drivers,
  isEditable,
  getDisabledForPosition,
  getDisabledForWinner,
  onChange,
  matchStatuses,
  fieldPoints,
}: {
  prediction: SprintPrediction;
  drivers: Driver[];
  isEditable: boolean;
  getDisabledForPosition: (i: number) => Driver[];
  getDisabledForWinner: () => Driver[];
  onChange: (update: Partial<SprintPrediction>) => void;
  matchStatuses: SprintMatchStatuses | null;
  fieldPoints: SprintFieldPoints | null;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DriverSelect
          label={t.predictionsPage.sprintPolePosition}
          value={prediction.sprintPole}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ sprintPole: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.sprintPole}
          pointsAwarded={fieldPoints?.sprintPole ?? null}
        />
        <DriverSelect
          label={t.predictionsPage.sprintWinnerP1}
          value={prediction.sprintWinner}
          drivers={drivers}
          disabledDrivers={getDisabledForWinner()}
          onChange={(d) => onChange({ sprintWinner: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.sprintWinner}
          pointsAwarded={fieldPoints?.sprintWinner ?? null}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t.predictionsPage.restOfTop8}
          </span>
          <span className="text-[9px] text-muted/50">{t.predictionsPage.restOfTop8Sub}</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {prediction.restOfTop8.map((driver, i) => (
            <DriverSelect
              key={i}
              label=""
              position={i + 2}
              value={driver}
              drivers={drivers}
              disabledDrivers={getDisabledForPosition(i)}
              onChange={(d) => {
                const updated = [...prediction.restOfTop8];
                updated[i] = d;
                onChange({ restOfTop8: updated });
              }}
              disabled={!isEditable}
              matchStatus={matchStatuses?.restOfTop8[i]}
              pointsAwarded={fieldPoints?.restOfTop8[i] ?? null}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        <DriverSelect
          label={t.predictionsPage.fastestLap}
          value={prediction.fastestLap}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ fastestLap: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.fastestLap}
          pointsAwarded={fieldPoints?.fastestLap ?? null}
        />
      </div>

      {fieldPoints && (
        <BonusBadges
          badges={[
            fieldPoints.perfectPodiumBonus > 0
              ? { label: t.predictionsPage.perfectPodiumBonus, points: fieldPoints.perfectPodiumBonus, tone: "green" as const }
              : fieldPoints.matchPodiumBonus > 0
                ? { label: t.predictionsPage.matchPodiumBonus, points: fieldPoints.matchPodiumBonus, tone: "amber" as const }
                : null,
            fieldPoints.perfectTop8Bonus > 0
              ? { label: t.predictionsPage.perfectTop8Bonus, points: fieldPoints.perfectTop8Bonus, tone: "green" as const }
              : fieldPoints.matchTop8Bonus > 0
                ? { label: t.predictionsPage.matchTop8Bonus, points: fieldPoints.matchTop8Bonus, tone: "amber" as const }
                : null,
          ].filter((b): b is { label: string; points: number; tone: "green" | "amber" } => b !== null)}
        />
      )}
    </div>
  );
}

/* ---------- Bonus Badges ---------- */

function BonusBadges({
  badges,
}: {
  badges: { label: string; points: number; tone: "green" | "amber" }[];
}) {
  const { t } = useLanguage();
  if (badges.length === 0) return null;
  return (
    <div className="border-t border-border pt-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {t.predictionsPage.bonuses}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((b) => {
          const toneClass =
            b.tone === "green"
              ? "border-f1-green/30 bg-f1-green/10 text-f1-green"
              : "border-f1-amber/30 bg-f1-amber/10 text-f1-amber";
          return (
            <span
              key={b.label}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneClass}`}
            >
              <Trophy size={10} />
              {b.label}
              <span className="tabular-nums">+{b.points}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Champion Form ---------- */

function ChampionForm({
  prediction,
  drivers,
  teams,
  teamsWithDrivers,
  teamBestDriverPredictions,
  teamColors,
  isEditable,
  championPhase,
  onChange,
  onTeamBestDriverChange,
}: {
  prediction: ChampionPrediction;
  drivers: Driver[];
  teams: string[];
  teamsWithDrivers: TeamWithDrivers[];
  teamBestDriverPredictions: TeamBestDriverPrediction[];
  teamColors: Record<string, string>;
  isEditable: boolean;
  championPhase: ChampionPredictionPhase;
  onChange: (pred: ChampionPrediction) => void;
  onTeamBestDriverChange: (preds: TeamBestDriverPrediction[]) => void;
}) {
  const { t } = useLanguage();
  const [teamOpen, setTeamOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const teamBtnRef = useRef<HTMLButtonElement>(null);

  function handleTeamToggle() {
    if (!teamOpen && teamBtnRef.current) {
      const rect = teamBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 240 && rect.top > 240);
    }
    setTeamOpen(!teamOpen);
  }

  return (
    <div className="space-y-4">
      {championPhase === "closed" && (
        <div className="flex items-center gap-2 rounded-lg border border-f1-red/30 bg-f1-red/5 px-3 py-2">
          <Info size={14} className="shrink-0 text-f1-red" />
          <p className="text-[11px] text-f1-red">
            {t.predictionsPage.championClosedWarning}
          </p>
        </div>
      )}

      {championPhase === "half" && (
        <div className="flex items-center gap-2 rounded-lg border border-f1-amber/30 bg-f1-amber/5 px-3 py-2">
          <Info size={14} className="shrink-0 text-f1-amber" />
          <p className="text-[11px] text-f1-amber">
            {t.predictionsPage.halfPointsWarning}
          </p>
        </div>
      )}

      <DriverSelect
        label={t.predictionsPage.wdc}
        value={prediction.wdcWinner}
        drivers={drivers}
        disabledDrivers={[]}
        onChange={(d) => onChange({ ...prediction, wdcWinner: d })}
        disabled={!isEditable}
        pointsAwarded={prediction.status === "scored" ? prediction.wdcPoints : null}
      />

      <div className="relative">
        <label className="mb-1 flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <span>{t.predictionsPage.wcc}</span>
          {prediction.status === "scored" && prediction.wccPoints > 0 && (
            <span
              className="inline-flex items-center rounded-full bg-f1-green/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-f1-green normal-case tracking-normal tabular-nums"
              aria-label={`+${prediction.wccPoints} points earned`}
            >
              +{prediction.wccPoints}
            </span>
          )}
        </label>
        <button
          ref={teamBtnRef}
          type="button"
          disabled={!isEditable}
          onClick={handleTeamToggle}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${
            !isEditable
              ? "cursor-not-allowed border-border bg-card/50 text-muted/50"
              : teamOpen
                ? "border-border-hover bg-input-bg text-f1-white"
                : "border-border bg-input-bg text-foreground hover:border-border-hover"
          }`}
        >
          {prediction.wccWinner ? (
            <span className="flex items-center gap-2 font-medium">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `#${teamColors[prediction.wccWinner] ?? "737373"}` }}
              />
              {prediction.wccWinner}
            </span>
          ) : (
            <span className="text-muted">{t.predictionsPage.selectTeam}</span>
          )}
          <ChevronDown size={14} className={`text-muted transition-transform ${teamOpen ? "rotate-180" : ""}`} />
        </button>
        {teamOpen && isEditable && (
          <div
            className={`absolute left-0 z-40 w-full rounded-lg border border-border bg-card py-1 shadow-xl ${
              openUpward ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            <div className="max-h-48 overflow-y-auto">
              {teams.map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => {
                    onChange({ ...prediction, wccWinner: team });
                    setTeamOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-card-hover ${
                    prediction.wccWinner === team
                      ? "font-medium text-f1-white"
                      : "text-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: `#${teamColors[team] ?? "737373"}` }}
                  />
                  {team}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border pt-2" />

      {/* Most Wins / Most Podiums / Most DNFs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DriverSelect
          label={t.predictionsPage.mostWins}
          value={prediction.mostWinsDriver}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ ...prediction, mostWinsDriver: d })}
          disabled={!isEditable}
          pointsAwarded={prediction.status === "scored" ? prediction.mostWinsPoints : null}
        />
        <DriverSelect
          label={t.predictionsPage.mostPodiums}
          value={prediction.mostPodiumsDriver}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ ...prediction, mostPodiumsDriver: d })}
          disabled={!isEditable}
          pointsAwarded={prediction.status === "scored" ? prediction.mostPodiumsPoints : null}
        />
        <DriverSelect
          label={t.predictionsPage.mostDnfs}
          value={prediction.mostDnfsDriver}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ ...prediction, mostDnfsDriver: d })}
          disabled={!isEditable}
          pointsAwarded={prediction.status === "scored" ? prediction.mostDnfsPoints : null}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-border pt-2" />

      {/* Team Best Driver section */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            {t.predictionsPage.teamBestDriver}
          </span>
          <span className="text-[9px] text-muted/50">{t.predictionsPage.teamBestDriverSub}</span>
        </div>
        <div className="space-y-2">
          {teamsWithDrivers.map((team) => {
            const pred = teamBestDriverPredictions.find((p) => p.teamId === team.id);
            const selectedDriverNumber = pred?.driverNumber ?? null;
            return (
              <div
                key={team.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: `#${team.color}` }}
                />
                <span className="min-w-25 text-xs font-medium text-f1-white sm:min-w-35">
                  {team.name}
                </span>
                {pred?.isHalfPoints && (
                  <span className="text-[9px] text-f1-amber" title={t.predictionsPage.halfPointsWarning}>½</span>
                )}
                {pred?.status === "scored" && pred.pointsEarned > 0 && (
                  <span
                    className="inline-flex items-center rounded-full bg-f1-green/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-f1-green tabular-nums"
                    aria-label={`+${pred.pointsEarned} points earned`}
                  >
                    +{pred.pointsEarned}
                  </span>
                )}
                <div className="ml-auto flex gap-1.5">
                  {team.drivers.map((d) => {
                    const isSelected = selectedDriverNumber === d.driverNumber;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={!isEditable}
                        onClick={() => {
                          if (!isEditable) return;
                          const newPreds = teamBestDriverPredictions.map((p) =>
                            p.teamId === team.id
                              ? { ...p, driverId: d.id, driverNumber: d.driverNumber }
                              : p
                          );
                          onTeamBestDriverChange(newPreds);
                        }}
                        className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                          isSelected
                            ? "bg-f1-red text-white"
                            : !isEditable
                              ? "bg-card/50 text-muted/50 cursor-not-allowed"
                              : "bg-card text-muted hover:bg-card-hover hover:text-f1-white"
                        }`}
                      >
                        {d.nameAcronym}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Results Display ---------- */

function ResultsDisplay({
  result,
}: {
  result: RaceResult;
  type: "race";
}) {
  const { t } = useLanguage();
  return (
    <div className="border-b border-border bg-card/30 px-4 py-3 sm:px-5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-f1-green">
        {t.predictionsPage.raceResults}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        <ResultItem label={t.predictionsPage.pole} driver={result.polePosition} />
        <ResultItem label={t.predictionsPage.winner} driver={result.raceWinner} />
        <ResultItem label={t.predictionsPage.fastestLap} driver={result.fastestLap} />
        {result.fastestPitStop && (
          <ResultItem label={t.predictionsPage.fastestPit} driver={result.fastestPitStop} />
        )}
        {result.driverOfTheDay && (
          <ResultItem label={t.predictionsPage.driverOfTheDay} driver={result.driverOfTheDay} />
        )}
      </div>
      <div className="mt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {t.predictionsPage.top10}
        </span>
        <div className="mt-1 grid grid-cols-5 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">
          {result.top10.map((driver, i) => (
            <span
              key={driver.driverNumber}
              className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 text-[10px]"
            >
              <span className="tabular-nums text-muted">{i + 1}.</span>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `#${driver.teamColor}` }}
              />
              <span className="font-medium text-foreground">
                {driver.nameAcronym}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SprintResultsDisplay({ result }: { result: SprintResult }) {
  const { t } = useLanguage();
  return (
    <div className="border-b border-border bg-card/30 px-4 py-3 sm:px-5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-f1-green">
        {t.predictionsPage.sprintResults}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        <ResultItem label={t.predictionsPage.sprintPole} driver={result.sprintPole} />
        <ResultItem label={t.predictionsPage.sprintWinner} driver={result.sprintWinner} />
        <ResultItem label={t.predictionsPage.fastestLap} driver={result.fastestLap} />
      </div>
      <div className="mt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {t.predictionsPage.top8}
        </span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {result.top8.map((driver, i) => (
            <span
              key={driver.driverNumber}
              className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-0.5 text-[10px]"
            >
              <span className="tabular-nums text-muted">{i + 1}.</span>
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: `#${driver.teamColor}` }}
              />
              <span className="font-medium text-foreground">
                {driver.nameAcronym}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultItem({ label, driver }: { label: string; driver: Driver }) {
  return (
    <div>
      <span className="text-[10px] text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: `#${driver.teamColor}` }}
        />
        <span className="font-medium text-foreground">{driver.nameAcronym}</span>
        <span className="text-muted">{driver.lastName}</span>
      </div>
    </div>
  );
}
