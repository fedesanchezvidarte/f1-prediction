"use client";

import { useState, useMemo, useCallback, useRef, useTransition } from "react";
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
  Loader2,
} from "lucide-react";
import type {
  Race,
  Driver,
  FullRacePrediction,
  SprintPrediction,
  ChampionPrediction,
  RaceResult,
  SprintResult,
  RaceStatus,
} from "@/types";
import { getRaceStatus } from "@/lib/dummy-data";
import { DriverSelect, type MatchStatus } from "./DriverSelect";

type TabMode = "race" | "sprint" | "champion";

interface RaceMatchStatuses {
  polePosition: MatchStatus;
  raceWinner: MatchStatus;
  restOfTop10: MatchStatus[];
  fastestLap: MatchStatus;
  fastestPitStop: MatchStatus;
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
  predictions: FullRacePrediction[];
  sprintPredictions: SprintPrediction[];
  championPrediction: ChampionPrediction;
  raceResults: Record<number, RaceResult>;
  sprintResults: Record<number, SprintResult>;
  isOwner: boolean;
  displayName?: string;
  initialRaceIndex?: number;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-f1-amber/15", text: "text-f1-amber", label: "Pending" },
    submitted: { bg: "bg-f1-blue/15", text: "text-f1-blue", label: "Submitted" },
    scored: { bg: "bg-f1-green/15", text: "text-f1-green", label: "Scored" },
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
  const config: Record<RaceStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    upcoming: { bg: "bg-f1-blue/15", text: "text-f1-blue", label: "Upcoming", icon: <Clock size={10} /> },
    live: { bg: "bg-f1-red/15", text: "text-f1-red", label: "LIVE", icon: <Zap size={10} /> },
    completed: { bg: "bg-f1-green/15", text: "text-f1-green", label: "Completed", icon: <CheckCircle2 size={10} /> },
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
  predictions: initialPredictions,
  sprintPredictions: initialSprintPredictions,
  championPrediction: initialChampionPrediction,
  raceResults,
  sprintResults,
  isOwner,
  displayName,
  initialRaceIndex = 0,
}: RacePredictionContentProps) {
  const [raceIndex, setRaceIndex] = useState(initialRaceIndex);
  const [tab, setTab] = useState<TabMode>("race");
  const [predictions, setPredictions] = useState(initialPredictions);
  const [sprintPreds, setSprintPreds] = useState(initialSprintPredictions);
  const [champPred, setChampPred] = useState(initialChampionPrediction);
  const [showResults, setShowResults] = useState(false);

  const currentRace = races[raceIndex];
  const raceStatus = getRaceStatus(currentRace);
  const isChampionTab = tab === "champion";

  const nextRaceIndex = useMemo(() => {
    const now = new Date();
    for (let i = 0; i < races.length; i++) {
      if (new Date(races[i].dateEnd) > now) return i;
    }
    return -1;
  }, [races]);

  const currentPrediction = predictions.find((p) => p.raceId === currentRace.meetingKey);
  const currentSprintPred = sprintPreds.find((p) => p.raceId === currentRace.meetingKey);
  const currentResult = raceResults[currentRace.meetingKey];
  const currentSprintResult = sprintResults[currentRace.meetingKey];

  const isEditable = isOwner && (
    isChampionTab
      ? champPred.status !== "scored"
      : tab === "sprint"
        ? currentSprintPred?.status !== "scored"
        : currentPrediction?.status !== "scored"
  );

  const hasEdits = useMemo(() => {
    if (isChampionTab) return champPred.wdcWinner !== null || champPred.wccWinner !== null;
    if (tab === "sprint" && currentSprintPred) {
      return currentSprintPred.sprintPole !== null || currentSprintPred.sprintWinner !== null || currentSprintPred.restOfTop8.some((d) => d !== null);
    }
    if (currentPrediction) {
      return currentPrediction.polePosition !== null || currentPrediction.raceWinner !== null || currentPrediction.restOfTop10.some((d) => d !== null);
    }
    return false;
  }, [isChampionTab, tab, champPred, currentSprintPred, currentPrediction]);

  const getSubmitButtonConfig = useCallback(() => {
    const status = isChampionTab
      ? champPred.status
      : tab === "sprint"
        ? currentSprintPred?.status ?? "pending"
        : currentPrediction?.status ?? "pending";

    if (status === "scored") return { color: "bg-muted/20 text-muted cursor-not-allowed", label: "Scored" };
    if (status === "submitted" && !hasEdits) return { color: "bg-f1-blue text-white", label: "Submitted" };
    if (status === "submitted") return { color: "bg-f1-amber text-black", label: "Update Prediction" };
    return { color: "bg-f1-green text-black hover:bg-f1-green/80", label: "Submit Prediction" };
  }, [isChampionTab, tab, champPred, currentSprintPred, currentPrediction, hasEdits]);

  const submitConfig = getSubmitButtonConfig();

  const usedDriversInRace = useMemo(() => {
    if (!currentPrediction) return [];
    const used: Driver[] = [];
    if (currentPrediction.raceWinner) used.push(currentPrediction.raceWinner);
    currentPrediction.restOfTop10.forEach((d) => { if (d) used.push(d); });
    return used;
  }, [currentPrediction]);

  const usedDriversInSprint = useMemo(() => {
    if (!currentSprintPred) return [];
    const used: Driver[] = [];
    if (currentSprintPred.sprintWinner) used.push(currentSprintPred.sprintWinner);
    currentSprintPred.restOfTop8.forEach((d) => { if (d) used.push(d); });
    return used;
  }, [currentSprintPred]);

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
        setChampPred({ ...champPred, wdcWinner: null, wccWinner: null, status: "pending" });
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
        const firstRace = races[0];
        const seasonStarted = firstRace && new Date(firstRace.dateStart) < new Date();
        payload = {
          type: "champion",
          wdcDriverNumber: champPred.wdcWinner?.driverNumber ?? null,
          wccTeamName: champPred.wccWinner,
          isHalfPoints: seasonStarted,
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

  const pointsEarned = isChampionTab
    ? champPred.pointsEarned
    : tab === "sprint"
      ? currentSprintPred?.pointsEarned ?? null
      : currentPrediction?.pointsEarned ?? null;

  const teamColors = useMemo(() => {
    const map: Record<string, string> = {};
    drivers.forEach((d) => {
      if (!map[d.teamName]) map[d.teamName] = d.teamColor;
    });
    return map;
  }, [drivers]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const raceMatchStatuses = useMemo((): RaceMatchStatuses | null => {
    if (raceStatus !== "completed" || !currentResult || !currentPrediction) return null;
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
      fastestPitStop: fieldStatus(currentPrediction.fastestPitStop, currentResult.fastestPitStop),
    };
  }, [raceStatus, currentResult, currentPrediction]);

  const sprintMatchStatuses = useMemo((): SprintMatchStatuses | null => {
    if (raceStatus !== "completed" || !currentSprintResult || !currentSprintPred) return null;
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
  }, [raceStatus, currentSprintResult, currentSprintPred]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* Header: back button + user identification */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5 sm:px-5">
        <a
          href="/leaderboard"
          className="flex items-center gap-1.5 text-[11px] font-medium text-muted transition-colors hover:text-f1-white"
        >
          <ChevronLeft size={14} />
          Leaderboard
        </a>
        {displayName && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-f1-red" />
            {isOwner ? (
              <span className="font-medium text-f1-white">{displayName}</span>
            ) : (
              <span>{displayName}&apos;s predictions</span>
            )}
          </span>
        )}
      </div>

      {/* Race Navigation */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <button
          disabled={raceIndex === 0 && !isChampionTab}
          onClick={() => {
            if (isChampionTab) {
              setTab("race");
              setRaceIndex(races.length - 1);
            } else if (raceIndex > 0) {
              setRaceIndex(raceIndex - 1);
              setTab("race");
            }
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-30"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {races.map((race, i) => {
            const isSelected = !isChampionTab && raceIndex === i;
            const isNextRace = i === nextRaceIndex;
            return (
              <button
                key={race.meetingKey}
                onClick={() => {
                  setRaceIndex(i);
                  if (tab === "champion") setTab("race");
                  if (tab === "sprint" && !race.hasSprint) setTab("race");
                }}
                className={`relative rounded-md px-2 py-1 text-[10px] font-medium transition-colors sm:px-2.5 ${
                  isSelected
                    ? "bg-f1-red text-white"
                    : isNextRace
                      ? "bg-f1-red/15 text-f1-red ring-1 ring-f1-red/40"
                      : "text-muted hover:bg-card-hover hover:text-f1-white"
                }`}
              >
                {isNextRace && !isSelected && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-f1-red animate-pulse" />
                )}
                <span className="hidden sm:inline">R{race.round}</span>
                <span className="sm:hidden">{race.round}</span>
              </button>
            );
          })}
          <button
            onClick={() => setTab("champion")}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors sm:px-2.5 ${
              isChampionTab
                ? "bg-f1-amber text-black"
                : "text-muted hover:bg-card-hover hover:text-f1-white"
            }`}
          >
            <Crown size={10} />
            <span className="hidden sm:inline">Champion</span>
          </button>
        </div>

        <button
          disabled={isChampionTab}
          onClick={() => {
            if (raceIndex < races.length - 1) {
              setRaceIndex(raceIndex + 1);
              setTab("race");
            } else {
              setTab("champion");
            }
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-30"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Race Info / Champion Header */}
      {isChampionTab ? (
        <ChampionHeader />
      ) : (
        <RaceInfoBar
          race={currentRace}
          raceStatus={raceStatus}
          formatDate={formatDate}
          pointsEarned={pointsEarned}
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
            Race
          </button>
          <button
            onClick={() => currentRace.hasSprint && setTab("sprint")}
            disabled={!currentRace.hasSprint}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-colors ${
              tab === "sprint"
                ? "border-b-2 border-f1-red text-f1-white"
                : !currentRace.hasSprint
                  ? "cursor-not-allowed text-muted/30"
                  : "text-muted hover:text-f1-white"
            }`}
          >
            <Zap size={12} />
            Sprint
            {!currentRace.hasSprint && (
              <span className="text-[9px] text-muted/30">N/A</span>
            )}
          </button>
        </div>
      )}

      {/* Results Toggle */}
      {!isChampionTab && raceStatus === "completed" && (
        <div className="border-b border-border px-4 py-2 sm:px-5">
          <button
            onClick={() => setShowResults(!showResults)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-f1-blue transition-colors hover:text-f1-blue/80"
          >
            {showResults ? <EyeOff size={12} /> : <Eye size={12} />}
            {showResults ? "Hide Results" : "Show Results"}
          </button>
        </div>
      )}

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
            teamColors={teamColors}
            isEditable={isEditable}
            onChange={setChampPred}
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
            />
          ) : (
            <p className="py-8 text-center text-xs text-muted">
              No sprint predictions available for this race.
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
          />
        ) : (
          <p className="py-8 text-center text-xs text-muted">
            No predictions available for this race.
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
            Dismiss
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
              <span className="text-[10px] text-muted">pts earned</span>
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
            {isEditable && (
              <button
                onClick={() => setShowResetModal(true)}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-50"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!isEditable || isSaving}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[11px] font-semibold transition-colors ${submitConfig.color} ${isSaving ? "opacity-70" : ""}`}
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {isSaving ? "Saving..." : submitConfig.label}
            </button>
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
  const label =
    tab === "champion"
      ? "Championship"
      : tab === "sprint"
        ? `Sprint — ${raceName}`
        : raceName ?? "Race";

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
            <h2 className="text-sm font-semibold text-f1-white">Reset prediction?</h2>
            <p className="mt-0.5 text-[11px] text-muted">{label}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-xs leading-relaxed text-muted">
            This will clear all your selections for this prediction and set it back to{" "}
            <span className="font-medium text-f1-white">pending</span>. This action cannot be undone.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg bg-f1-red px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-f1-red/80 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            {isSaving ? "Resetting..." : "Reset prediction"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Race Info Bar ---------- */

function RaceInfoBar({
  race,
  raceStatus,
  formatDate,
  pointsEarned,
}: {
  race: Race;
  raceStatus: RaceStatus;
  formatDate: (d: string) => string;
  pointsEarned: number | null;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-f1-white">
              {race.raceName}
            </h2>
            <RaceStatusBadge status={raceStatus} />
          </div>
          <p className="mt-0.5 text-[11px] text-muted">
            {race.circuitShortName} — {race.location}, {race.countryName}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[11px] tabular-nums text-muted">
          {formatDate(race.dateStart)} – {formatDate(race.dateEnd)}
        </span>
        <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted">
          R{race.round}
        </span>
      </div>
    </div>
  );
}

/* ---------- Champion Header ---------- */

function ChampionHeader() {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2">
        <Crown size={16} className="text-f1-amber" />
        <h2 className="text-sm font-semibold text-f1-white">
          Championship Predictions
        </h2>
      </div>
      <div className="group relative">
        <Info size={14} className="cursor-help text-muted" />
        <div className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-card p-3 opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          <p className="text-[11px] leading-relaxed text-muted">
            Championship predictions are locked after the start of the first race.
            Predictions changed after the summer break earn half points.
          </p>
        </div>
      </div>
    </div>
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
}: {
  prediction: FullRacePrediction;
  drivers: Driver[];
  isEditable: boolean;
  getDisabledForPosition: (i: number) => Driver[];
  getDisabledForWinner: () => Driver[];
  onChange: (update: Partial<FullRacePrediction>) => void;
  matchStatuses: RaceMatchStatuses | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DriverSelect
          label="Pole Position"
          value={prediction.polePosition}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ polePosition: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.polePosition}
        />
        <DriverSelect
          label="Race Winner (P1)"
          value={prediction.raceWinner}
          drivers={drivers}
          disabledDrivers={getDisabledForWinner()}
          onChange={(d) => onChange({ raceWinner: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.raceWinner}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Rest of Top 10
          </span>
          <span className="text-[9px] text-muted/50">(P2 – P10, excluding race winner)</span>
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
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DriverSelect
          label="Fastest Lap"
          value={prediction.fastestLap}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ fastestLap: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.fastestLap}
        />
        <DriverSelect
          label="Fastest Pit Stop"
          value={prediction.fastestPitStop}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ fastestPitStop: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.fastestPitStop}
        />
      </div>
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
}: {
  prediction: SprintPrediction;
  drivers: Driver[];
  isEditable: boolean;
  getDisabledForPosition: (i: number) => Driver[];
  getDisabledForWinner: () => Driver[];
  onChange: (update: Partial<SprintPrediction>) => void;
  matchStatuses: SprintMatchStatuses | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DriverSelect
          label="Sprint Pole Position"
          value={prediction.sprintPole}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ sprintPole: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.sprintPole}
        />
        <DriverSelect
          label="Sprint Winner (P1)"
          value={prediction.sprintWinner}
          drivers={drivers}
          disabledDrivers={getDisabledForWinner()}
          onChange={(d) => onChange({ sprintWinner: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.sprintWinner}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
            Rest of Top 8
          </span>
          <span className="text-[9px] text-muted/50">(P2 – P8, excluding sprint winner)</span>
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
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        <DriverSelect
          label="Fastest Lap"
          value={prediction.fastestLap}
          drivers={drivers}
          disabledDrivers={[]}
          onChange={(d) => onChange({ fastestLap: d })}
          disabled={!isEditable}
          matchStatus={matchStatuses?.fastestLap}
        />
      </div>
    </div>
  );
}

/* ---------- Champion Form ---------- */

function ChampionForm({
  prediction,
  drivers,
  teams,
  teamColors,
  isEditable,
  onChange,
}: {
  prediction: ChampionPrediction;
  drivers: Driver[];
  teams: string[];
  teamColors: Record<string, string>;
  isEditable: boolean;
  onChange: (pred: ChampionPrediction) => void;
}) {
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
      {prediction.isHalfPoints && (
        <div className="flex items-center gap-2 rounded-lg border border-f1-amber/30 bg-f1-amber/5 px-3 py-2">
          <Info size={14} className="shrink-0 text-f1-amber" />
          <p className="text-[11px] text-f1-amber">
            Predictions changed after the summer break earn half points.
          </p>
        </div>
      )}

      <DriverSelect
        label="World Drivers' Champion (WDC)"
        value={prediction.wdcWinner}
        drivers={drivers}
        disabledDrivers={[]}
        onChange={(d) => onChange({ ...prediction, wdcWinner: d })}
        disabled={!isEditable}
      />

      <div className="relative">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
          World Constructors&apos; Champion (WCC)
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
            <span className="text-muted">Select team...</span>
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
  return (
    <div className="border-b border-border bg-card/30 px-4 py-3 sm:px-5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-f1-green">
        Race Results
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        <ResultItem label="Pole" driver={result.polePosition} />
        <ResultItem label="Winner" driver={result.raceWinner} />
        <ResultItem label="Fastest Lap" driver={result.fastestLap} />
        <ResultItem label="Fastest Pit" driver={result.fastestPitStop} />
      </div>
      <div className="mt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Top 10
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
  return (
    <div className="border-b border-border bg-card/30 px-4 py-3 sm:px-5">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-f1-green">
        Sprint Results
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
        <ResultItem label="Sprint Pole" driver={result.sprintPole} />
        <ResultItem label="Sprint Winner" driver={result.sprintWinner} />
        <ResultItem label="Fastest Lap" driver={result.fastestLap} />
      </div>
      <div className="mt-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          Top 8
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
