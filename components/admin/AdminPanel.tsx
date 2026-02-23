"use client";

import { useState } from "react";
import {
  Shield,
  Download,
  PenLine,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Trophy,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ManualResultForm } from "@/components/admin/ManualResultForm";

interface AdminDriver {
  id: number;
  first_name: string;
  last_name: string;
  name_acronym: string;
  driver_number: number;
  team_id: number;
  teamName: string;
  teamColor: string;
}

interface RaceResult {
  race_id: number;
  pole_position_driver_id: number;
  top_10: number[];
  fastest_lap_driver_id: number;
  fastest_pit_stop_driver_id: number;
}

interface SprintResult {
  race_id: number;
  sprint_pole_driver_id: number;
  top_8: number[];
  fastest_lap_driver_id: number;
}

interface AdminRace {
  id: number;
  meetingKey: number;
  raceName: string;
  circuitShortName: string;
  round: number;
  hasSprint: boolean;
  dateStart: string;
  dateEnd: string;
  hasRaceResult: boolean;
  hasSprintResult: boolean;
  raceResult: RaceResult | null;
  sprintResult: SprintResult | null;
  racePredictions: { submitted: number; scored: number };
  sprintPredictions: { submitted: number; scored: number };
}

interface AdminPanelProps {
  races: AdminRace[];
  drivers: AdminDriver[];
}

type SessionType = "race" | "sprint";

export function AdminPanel({ races, drivers }: AdminPanelProps) {
  const { t } = useLanguage();
  const admin = t.admin;
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, SessionType>>({});
  const [fetchingState, setFetchingState] = useState<Record<string, "loading" | "success" | "error">>({});
  const [fetchMessages, setFetchMessages] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState<Record<string, boolean>>({});
  const [rescoringState, setRescoringState] = useState<Record<number, "loading" | "success" | "error">>({});

  const now = new Date();

  function getRaceStatus(race: AdminRace): "upcoming" | "live" | "completed" {
    const start = new Date(race.dateStart);
    const end = new Date(race.dateEnd);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "live";
    return "completed";
  }

  function getSessionTab(raceId: number): SessionType {
    return activeTab[raceId] ?? "race";
  }

  function getDriverName(driverId: number): string {
    const d = drivers.find((dr) => dr.id === driverId);
    return d ? `${d.name_acronym} (#${d.driver_number})` : `ID ${driverId}`;
  }

  async function handleFetchOpenF1(raceId: number, meetingKey: number, sessionType: SessionType) {
    const key = `${raceId}-${sessionType}`;
    setFetchingState((prev) => ({ ...prev, [key]: "loading" }));
    setFetchMessages((prev) => ({ ...prev, [key]: "" }));

    try {
      const res = await fetch("/api/results/fetch-openf1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingKey, sessionType }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFetchingState((prev) => ({ ...prev, [key]: "success" }));
        setFetchMessages((prev) => ({
          ...prev,
          [key]: `${admin.fetchSuccess} (${data.driversFound} drivers, ${data.scoring?.racePredictionsScored ?? 0} race + ${data.scoring?.sprintPredictionsScored ?? 0} sprint predictions scored)`,
        }));
      } else {
        setFetchingState((prev) => ({ ...prev, [key]: "error" }));
        setFetchMessages((prev) => ({
          ...prev,
          [key]: data.error || admin.fetchError,
        }));
      }
    } catch {
      setFetchingState((prev) => ({ ...prev, [key]: "error" }));
      setFetchMessages((prev) => ({
        ...prev,
        [key]: admin.fetchError,
      }));
    }
  }

  async function handleRescore(raceId: number) {
    setRescoringState((prev) => ({ ...prev, [raceId]: "loading" }));

    try {
      const res = await fetch("/api/results/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRescoringState((prev) => ({ ...prev, [raceId]: "success" }));
      } else {
        setRescoringState((prev) => ({ ...prev, [raceId]: "error" }));
      }
    } catch {
      setRescoringState((prev) => ({ ...prev, [raceId]: "error" }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-f1-red/15">
          <Shield size={20} className="text-f1-red" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-f1-white">{admin.title}</h1>
          <p className="text-xs text-muted">{admin.subtitle}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">{admin.totalRaces}</p>
          <p className="mt-1 text-xl font-bold text-f1-white">{races.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">{admin.resultsEntered}</p>
          <p className="mt-1 text-xl font-bold text-f1-green">
            {races.filter((r) => r.hasRaceResult).length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">{admin.pending}</p>
          <p className="mt-1 text-xl font-bold text-f1-amber">
            {races.filter((r) => !r.hasRaceResult && getRaceStatus(r) === "completed").length}
          </p>
        </div>
      </div>

      {/* Race list */}
      <div className="space-y-2">
        {races.map((race) => {
          const status = getRaceStatus(race);
          const isExpanded = expandedRace === race.id;
          const sessionType = getSessionTab(race.id);
          const fetchKey = `${race.id}-${sessionType}`;
          const manualKey = `${race.id}-${sessionType}`;

          return (
            <div
              key={race.id}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              {/* Race header (always visible) */}
              <button
                onClick={() => setExpandedRace(isExpanded ? null : race.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-card-hover"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-f1-red/10 text-[10px] font-bold text-f1-red">
                    R{race.round}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-f1-white truncate">
                      {race.raceName}
                    </p>
                    <p className="text-[10px] text-muted">
                      {race.circuitShortName} · {new Date(race.dateEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Sprint badge */}
                  {race.hasSprint && (
                    <span className="rounded-full bg-f1-purple/15 px-2 py-0.5 text-[9px] font-semibold text-f1-purple">
                      {admin.sprint}
                    </span>
                  )}

                  {/* Status badges */}
                  {status === "upcoming" && (
                    <span className="flex items-center gap-1 rounded-full bg-muted/10 px-2 py-0.5 text-[9px] font-medium text-muted">
                      <Clock size={9} /> {admin.upcoming}
                    </span>
                  )}
                  {status === "live" && (
                    <span className="flex items-center gap-1 rounded-full bg-f1-green/15 px-2 py-0.5 text-[9px] font-semibold text-f1-green animate-pulse">
                      {admin.live}
                    </span>
                  )}

                  {/* Result status */}
                  {race.hasRaceResult ? (
                    <CheckCircle2 size={16} className="text-f1-green" />
                  ) : status === "completed" ? (
                    <AlertCircle size={16} className="text-f1-amber" />
                  ) : null}

                  {isExpanded ? (
                    <ChevronUp size={16} className="text-muted" />
                  ) : (
                    <ChevronDown size={16} className="text-muted" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 space-y-4">
                  {/* Session type tabs (if sprint race) */}
                  {race.hasSprint && (
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button
                        onClick={() => setActiveTab((prev) => ({ ...prev, [race.id]: "race" }))}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                          sessionType === "race"
                            ? "bg-f1-red/15 text-f1-white font-semibold"
                            : "text-muted hover:text-f1-white hover:bg-card-hover"
                        }`}
                      >
                        <Trophy size={12} className="inline mr-1" />
                        {admin.race}
                      </button>
                      <button
                        onClick={() => setActiveTab((prev) => ({ ...prev, [race.id]: "sprint" }))}
                        className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                          sessionType === "sprint"
                            ? "bg-f1-purple/15 text-f1-white font-semibold"
                            : "text-muted hover:text-f1-white hover:bg-card-hover"
                        }`}
                      >
                        <Zap size={12} className="inline mr-1" />
                        {admin.sprint}
                      </button>
                    </div>
                  )}

                  {/* Prediction stats */}
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted">{admin.predictionsSubmitted}: </span>
                      <span className="font-semibold text-f1-white">
                        {sessionType === "race"
                          ? race.racePredictions.submitted
                          : race.sprintPredictions.submitted}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted">{admin.predictionsScored}: </span>
                      <span className="font-semibold text-f1-white">
                        {sessionType === "race"
                          ? race.racePredictions.scored
                          : race.sprintPredictions.scored}
                      </span>
                    </div>
                  </div>

                  {/* Current result (if exists) */}
                  {((sessionType === "race" && race.hasRaceResult && race.raceResult) ||
                    (sessionType === "sprint" && race.hasSprintResult && race.sprintResult)) && (
                    <div className="rounded-lg border border-f1-green/20 bg-f1-green/5 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-f1-green" />
                        <span className="text-xs font-semibold text-f1-green">
                          {admin.currentResult}
                        </span>
                      </div>
                      {sessionType === "race" && race.raceResult && (
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted">{admin.pole}: </span>
                            <span className="text-f1-white">{getDriverName(race.raceResult.pole_position_driver_id)}</span>
                          </div>
                          <div>
                            <span className="text-muted">{admin.winner}: </span>
                            <span className="text-f1-white">{getDriverName(race.raceResult.top_10[0])}</span>
                          </div>
                          <div>
                            <span className="text-muted">{admin.fastestLap}: </span>
                            <span className="text-f1-white">{getDriverName(race.raceResult.fastest_lap_driver_id)}</span>
                          </div>
                          <div>
                            <span className="text-muted">{admin.fastestPit}: </span>
                            <span className="text-f1-white">{getDriverName(race.raceResult.fastest_pit_stop_driver_id)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted">{admin.top10}: </span>
                            <span className="text-f1-white">
                              {(race.raceResult.top_10 as number[]).map((id) => getDriverName(id)).join(", ")}
                            </span>
                          </div>
                        </div>
                      )}
                      {sessionType === "sprint" && race.sprintResult && (
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-muted">{admin.sprintPole}: </span>
                            <span className="text-f1-white">{getDriverName(race.sprintResult.sprint_pole_driver_id)}</span>
                          </div>
                          <div>
                            <span className="text-muted">{admin.winner}: </span>
                            <span className="text-f1-white">{getDriverName(race.sprintResult.top_8[0])}</span>
                          </div>
                          <div>
                            <span className="text-muted">{admin.fastestLap}: </span>
                            <span className="text-f1-white">{getDriverName(race.sprintResult.fastest_lap_driver_id)}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted">{admin.top8}: </span>
                            <span className="text-f1-white">
                              {(race.sprintResult.top_8 as number[]).map((id) => getDriverName(id)).join(", ")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    {/* Fetch from OpenF1 */}
                    <button
                      onClick={() => handleFetchOpenF1(race.id, race.meetingKey, sessionType)}
                      disabled={fetchingState[fetchKey] === "loading"}
                      className="flex items-center gap-1.5 rounded-lg bg-f1-blue/15 px-3 py-2 text-xs font-medium text-f1-blue transition-colors hover:bg-f1-blue/25 disabled:opacity-50"
                    >
                      {fetchingState[fetchKey] === "loading" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} />
                      )}
                      {fetchingState[fetchKey] === "loading"
                        ? admin.fetching
                        : admin.fetchOpenF1}
                    </button>

                    {/* Manual entry */}
                    <button
                      onClick={() =>
                        setShowManualForm((prev) => ({
                          ...prev,
                          [manualKey]: !prev[manualKey],
                        }))
                      }
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        showManualForm[manualKey]
                          ? "bg-f1-amber/25 text-f1-amber"
                          : "bg-f1-amber/15 text-f1-amber hover:bg-f1-amber/25"
                      }`}
                    >
                      <PenLine size={13} />
                      {(sessionType === "race" && race.hasRaceResult) ||
                      (sessionType === "sprint" && race.hasSprintResult)
                        ? admin.overrideResult
                        : admin.manualEntry}
                    </button>

                    {/* Re-score */}
                    {((sessionType === "race" && race.hasRaceResult) ||
                      (sessionType === "sprint" && race.hasSprintResult)) && (
                      <button
                        onClick={() => handleRescore(race.id)}
                        disabled={rescoringState[race.id] === "loading"}
                        className="flex items-center gap-1.5 rounded-lg bg-f1-purple/15 px-3 py-2 text-xs font-medium text-f1-purple transition-colors hover:bg-f1-purple/25 disabled:opacity-50"
                      >
                        {rescoringState[race.id] === "loading" ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <RefreshCw size={13} />
                        )}
                        {admin.rescore}
                      </button>
                    )}
                  </div>

                  {/* Fetch status message */}
                  {fetchMessages[fetchKey] && (
                    <div
                      className={`rounded-lg px-3 py-2 text-xs ${
                        fetchingState[fetchKey] === "success"
                          ? "bg-f1-green/10 text-f1-green"
                          : fetchingState[fetchKey] === "error"
                            ? "bg-f1-red/10 text-f1-red"
                            : ""
                      }`}
                    >
                      {fetchMessages[fetchKey]}
                    </div>
                  )}

                  {/* Re-score status */}
                  {rescoringState[race.id] === "success" && (
                    <div className="rounded-lg bg-f1-green/10 px-3 py-2 text-xs text-f1-green">
                      {admin.rescoreSuccess}
                    </div>
                  )}

                  {/* Manual form */}
                  {showManualForm[manualKey] && (
                    <ManualResultForm
                      raceId={race.id}
                      sessionType={sessionType}
                      drivers={drivers}
                      existingResult={
                        sessionType === "race" ? race.raceResult : race.sprintResult
                      }
                      onSuccess={() => {
                        setShowManualForm((prev) => ({ ...prev, [manualKey]: false }));
                        // Refresh the page to show updated data
                        window.location.reload();
                      }}
                      onCancel={() =>
                        setShowManualForm((prev) => ({ ...prev, [manualKey]: false }))
                      }
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
