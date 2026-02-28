"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Award,
  Trash2,
  Crown,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { ManualResultForm } from "@/components/admin/ManualResultForm";
import { DatetimeManager } from "@/components/admin/DatetimeManager";
import { ChampionResultForm } from "@/components/admin/ChampionResultForm";

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
  driver_of_the_day_driver_id?: number | null;
}

interface SprintResult {
  race_id: number;
  sprint_pole_driver_id: number;
  top_8: number[];
  fastest_lap_driver_id: number;
}

interface AdminTeam {
  id: number;
  name: string;
  color: string;
}

interface AdminChampionResult {
  wdc_driver_id: number;
  wcc_team_id: number;
  most_dnfs_driver_id: number | null;
  most_podiums_driver_id: number | null;
  most_wins_driver_id: number | null;
}

interface AdminTeamBestDriverResult {
  teamId: number;
  driverId: number;
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
  teams: AdminTeam[];
  championResult: AdminChampionResult | null;
  teamBestDriverResults: AdminTeamBestDriverResult[];
  championPredictions: { submitted: number; scored: number };
}

type SessionType = "race" | "sprint";

export function AdminPanel({ races, drivers, teams, championResult, teamBestDriverResults, championPredictions }: AdminPanelProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const admin = t.admin;
  const [expandedRace, setExpandedRace] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Record<number, SessionType>>({});
  const [fetchingState, setFetchingState] = useState<Record<string, "loading" | "success" | "error">>({});
  const [fetchMessages, setFetchMessages] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState<Record<string, boolean>>({});
  const [rescoringState, setRescoringState] = useState<Record<number, "loading" | "success" | "error">>({});
  const [achievementState, setAchievementState] = useState<Record<number, "loading" | "success" | "error">>({});
  const [achievementMessages, setAchievementMessages] = useState<Record<number, string>>({});
  const [globalAchievementState, setGlobalAchievementState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [globalAchievementMsg, setGlobalAchievementMsg] = useState("");
  const [resetResultState, setResetResultState] = useState<Record<string, "loading" | "success" | "error">>({});
  const [resetResultMessages, setResetResultMessages] = useState<Record<string, string>>({});
  const [globalRescoreState, setGlobalRescoreState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [globalRescoreMsg, setGlobalRescoreMsg] = useState("");
  const [showChampionForm, setShowChampionForm] = useState(false);
  const [championRescoreState, setChampionRescoreState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [championResetState, setChampionResetState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [championResetMessage, setChampionResetMessage] = useState("");
  const [championSaveMessage, setChampionSaveMessage] = useState("");

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

  function getTeamName(teamId: number): string {
    const team = teams.find((t) => t.id === teamId);
    return team ? team.name : `ID ${teamId}`;
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
        router.refresh();
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
        router.refresh();
      } else {
        setRescoringState((prev) => ({ ...prev, [raceId]: "error" }));
      }
    } catch {
      setRescoringState((prev) => ({ ...prev, [raceId]: "error" }));
    }
  }

  async function handleCalculateAchievements(raceId: number) {
    setAchievementState((prev) => ({ ...prev, [raceId]: "loading" }));
    setAchievementMessages((prev) => ({ ...prev, [raceId]: "" }));

    try {
      const res = await fetch("/api/achievements/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAchievementState((prev) => ({ ...prev, [raceId]: "success" }));
        setAchievementMessages((prev) => ({
          ...prev,
          [raceId]: `${admin.achievementsCalculated}: ${data.usersProcessed} ${admin.achievementsUsers}, ${data.achievementsAwarded} ${admin.achievementsAwarded}, ${data.achievementsRevoked} ${admin.achievementsRevoked}`,
        }));
        router.refresh();
      } else {
        setAchievementState((prev) => ({ ...prev, [raceId]: "error" }));
        setAchievementMessages((prev) => ({
          ...prev,
          [raceId]: data.error || admin.achievementsError,
        }));
      }
    } catch {
      setAchievementState((prev) => ({ ...prev, [raceId]: "error" }));
      setAchievementMessages((prev) => ({
        ...prev,
        [raceId]: admin.achievementsError,
      }));
    }
  }

  async function handleResetResult(raceId: number, sessionType: SessionType) {
    const key = `${raceId}-${sessionType}`;
    if (!window.confirm(admin.resetResultConfirm)) return;

    setResetResultState((prev) => ({ ...prev, [key]: "loading" }));
    setResetResultMessages((prev) => ({ ...prev, [key]: "" }));

    try {
      const res = await fetch("/api/results/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId, sessionType }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResetResultState((prev) => ({ ...prev, [key]: "success" }));
        setResetResultMessages((prev) => ({
          ...prev,
          [key]: `${admin.resetResultSuccess} (${data.predictionsReverted} ${admin.predictionsReverted})`,
        }));
        router.refresh();
      } else {
        setResetResultState((prev) => ({ ...prev, [key]: "error" }));
        setResetResultMessages((prev) => ({
          ...prev,
          [key]: data.error || admin.resetResultError,
        }));
      }
    } catch {
      setResetResultState((prev) => ({ ...prev, [key]: "error" }));
      setResetResultMessages((prev) => ({
        ...prev,
        [key]: admin.resetResultError,
      }));
    }
  }

  async function handleRescoreAll() {
    if (!window.confirm(admin.rescoreAllConfirm)) return;

    setGlobalRescoreState("loading");
    setGlobalRescoreMsg("");

    try {
      const res = await fetch("/api/results/score-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGlobalRescoreState("success");
        setGlobalRescoreMsg(
          `${admin.rescoreAllSuccess}: ${data.racesScored} ${admin.rescoreAllRaces}, ${data.totalRace} ${admin.rescoreAllRacePreds}, ${data.totalSprint} ${admin.rescoreAllSprintPreds}`
        );
        router.refresh();
      } else {
        setGlobalRescoreState("error");
        setGlobalRescoreMsg(data.error || admin.rescoreAllError);
      }
    } catch {
      setGlobalRescoreState("error");
      setGlobalRescoreMsg(admin.rescoreAllError);
    }
  }

  async function handleRescoreChampion() {
    setChampionRescoreState("loading");
    try {
      const res = await fetch("/api/results/champion/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChampionRescoreState("success");
        router.refresh();
      } else {
        setChampionRescoreState("error");
      }
    } catch {
      setChampionRescoreState("error");
    }
  }

  async function handleResetChampion() {
    if (!window.confirm(admin.championResetConfirm)) return;
    setChampionResetState("loading");
    setChampionResetMessage("");
    try {
      const res = await fetch("/api/results/champion/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChampionResetState("success");
        setChampionResetMessage(
          `${admin.championResetSuccess} (${data.predictionsReverted} ${admin.predictionsReverted})`
        );
        router.refresh();
      } else {
        setChampionResetState("error");
        setChampionResetMessage(data.error || admin.championResetError);
      }
    } catch {
      setChampionResetState("error");
      setChampionResetMessage(admin.championResetError);
    }
  }

  async function handleCalculateAllAchievements() {
    setGlobalAchievementState("loading");
    setGlobalAchievementMsg("");

    try {
      const res = await fetch("/api/achievements/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGlobalAchievementState("success");
        setGlobalAchievementMsg(
          `${admin.achievementsCalculated}: ${data.usersProcessed} ${admin.achievementsUsers}, ${data.achievementsAwarded} ${admin.achievementsAwarded}, ${data.achievementsRevoked} ${admin.achievementsRevoked}`
        );
        router.refresh();
      } else {
        setGlobalAchievementState("error");
        setGlobalAchievementMsg(data.error || admin.achievementsError);
      }
    } catch {
      setGlobalAchievementState("error");
      setGlobalAchievementMsg(admin.achievementsError);
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

      {/* Global actions — two-column layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Races — Re-score All */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-f1-purple" />
              <span className="text-sm font-semibold text-f1-white">{admin.racesSection}</span>
            </div>
            <button
              onClick={handleRescoreAll}
              disabled={globalRescoreState === "loading"}
              className="flex items-center gap-1.5 rounded-lg bg-f1-purple/15 px-3 py-2 text-xs font-medium text-f1-purple transition-colors hover:bg-f1-purple/25 disabled:opacity-50"
            >
              {globalRescoreState === "loading" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {globalRescoreState === "loading"
                ? admin.rescoring
                : admin.rescoreAll}
            </button>
          </div>
          {globalRescoreMsg && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                globalRescoreState === "success"
                  ? "bg-f1-green/10 text-f1-green"
                  : globalRescoreState === "error"
                    ? "bg-f1-red/10 text-f1-red"
                    : ""
              }`}
            >
              {globalRescoreMsg}
            </div>
          )}
        </div>

        {/* Achievements — Recalculate All */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-f1-amber" />
              <span className="text-sm font-semibold text-f1-white">{admin.achievementsSection}</span>
            </div>
            <button
              onClick={handleCalculateAllAchievements}
              disabled={globalAchievementState === "loading"}
              className="flex items-center gap-1.5 rounded-lg bg-f1-amber/15 px-3 py-2 text-xs font-medium text-f1-amber transition-colors hover:bg-f1-amber/25 disabled:opacity-50"
            >
              {globalAchievementState === "loading" ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {globalAchievementState === "loading"
                ? admin.calculatingAchievements
                : admin.recalculateAllAchievements}
            </button>
          </div>
          {globalAchievementMsg && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                globalAchievementState === "success"
                  ? "bg-f1-green/10 text-f1-green"
                  : globalAchievementState === "error"
                    ? "bg-f1-red/10 text-f1-red"
                    : ""
              }`}
            >
              {globalAchievementMsg}
            </div>
          )}
        </div>
      </div>

      {/* Championship section */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-f1-amber" />
            <span className="text-sm font-semibold text-f1-white">{admin.championSection}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-muted">{admin.predictionsSubmitted}: </span>
              <span className="font-semibold text-f1-white">{championPredictions.submitted}</span>
            </div>
            <div>
              <span className="text-muted">{admin.predictionsScored}: </span>
              <span className="font-semibold text-f1-white">{championPredictions.scored}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Current champion result */}
          {championResult && (
            <div className="rounded-lg border border-f1-green/20 bg-f1-green/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-f1-green" />
                <span className="text-xs font-semibold text-f1-green">{admin.currentResult}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted">{admin.wdcWinner}: </span>
                  <span className="text-f1-white">{getDriverName(championResult.wdc_driver_id)}</span>
                </div>
                <div>
                  <span className="text-muted">{admin.wccWinner}: </span>
                  <span className="text-f1-white">{getTeamName(championResult.wcc_team_id)}</span>
                </div>
                {championResult.most_dnfs_driver_id && (
                  <div>
                    <span className="text-muted">{admin.mostDnfs}: </span>
                    <span className="text-f1-white">{getDriverName(championResult.most_dnfs_driver_id)}</span>
                  </div>
                )}
                {championResult.most_podiums_driver_id && (
                  <div>
                    <span className="text-muted">{admin.mostPodiums}: </span>
                    <span className="text-f1-white">{getDriverName(championResult.most_podiums_driver_id)}</span>
                  </div>
                )}
                {championResult.most_wins_driver_id && (
                  <div>
                    <span className="text-muted">{admin.mostWins}: </span>
                    <span className="text-f1-white">{getDriverName(championResult.most_wins_driver_id)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Manual entry / override */}
            <button
              onClick={() => setShowChampionForm((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                showChampionForm
                  ? "bg-f1-amber/25 text-f1-amber"
                  : "bg-f1-amber/15 text-f1-amber hover:bg-f1-amber/25"
              }`}
            >
              <PenLine size={13} />
              {championResult ? admin.championOverrideResult : admin.championManualEntry}
            </button>

            {/* Re-score */}
            {championResult && (
              <button
                onClick={handleRescoreChampion}
                disabled={championRescoreState === "loading"}
                className="flex items-center gap-1.5 rounded-lg bg-f1-purple/15 px-3 py-2 text-xs font-medium text-f1-purple transition-colors hover:bg-f1-purple/25 disabled:opacity-50"
              >
                {championRescoreState === "loading" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                {championRescoreState === "loading"
                  ? admin.championRescoring
                  : admin.championRescore}
              </button>
            )}

            {/* Reset */}
            {championResult && (
              <button
                onClick={handleResetChampion}
                disabled={championResetState === "loading"}
                className="flex items-center gap-1.5 rounded-lg bg-f1-red/15 px-3 py-2 text-xs font-medium text-f1-red transition-colors hover:bg-f1-red/25 disabled:opacity-50"
              >
                {championResetState === "loading" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                {championResetState === "loading"
                  ? admin.resettingResult
                  : admin.resetResult}
              </button>
            )}
          </div>

          {/* Re-score status */}
          {championRescoreState === "success" && (
            <div className="rounded-lg bg-f1-green/10 px-3 py-2 text-xs text-f1-green">
              {admin.championRescoreSuccess}
            </div>
          )}
          {championRescoreState === "error" && (
            <div className="rounded-lg bg-f1-red/10 px-3 py-2 text-xs text-f1-red">
              {admin.saveError}
            </div>
          )}

          {/* Reset status */}
          {championResetMessage && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                championResetState === "success"
                  ? "bg-f1-green/10 text-f1-green"
                  : "bg-f1-red/10 text-f1-red"
              }`}
            >
              {championResetMessage}
            </div>
          )}

          {/* Save status */}
          {championSaveMessage && !showChampionForm && (
            <div className="rounded-lg bg-f1-green/10 px-3 py-2 text-xs text-f1-green">
              {championSaveMessage}
            </div>
          )}

          {/* Champion form */}
          {showChampionForm && (
            <ChampionResultForm
              drivers={drivers}
              teams={teams}
              existingResult={championResult}
              existingTeamBestDriverResults={teamBestDriverResults}
              onSuccess={() => {
                setShowChampionForm(false);
                setChampionSaveMessage(admin.championSaveSuccess);
                router.refresh();
              }}
              onCancel={() => setShowChampionForm(false)}
            />
          )}
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
                aria-expanded={isExpanded}
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

                  {/* Datetime manager */}
                  <DatetimeManager
                    raceId={race.id}
                    dateStart={race.dateStart}
                    dateEnd={race.dateEnd}
                    onUpdate={() => router.refresh()}
                  />

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
                          {race.raceResult.driver_of_the_day_driver_id && (
                            <div>
                              <span className="text-muted">{admin.driverOfTheDay}: </span>
                              <span className="text-f1-white">{getDriverName(race.raceResult.driver_of_the_day_driver_id)}</span>
                            </div>
                          )}
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

                    {/* Recalculate achievements for this race */}
                    {((sessionType === "race" && race.hasRaceResult) ||
                      (sessionType === "sprint" && race.hasSprintResult)) && (
                      <button
                        onClick={() => handleCalculateAchievements(race.id)}
                        disabled={achievementState[race.id] === "loading"}
                        className="flex items-center gap-1.5 rounded-lg bg-f1-amber/15 px-3 py-2 text-xs font-medium text-f1-amber transition-colors hover:bg-f1-amber/25 disabled:opacity-50"
                      >
                        {achievementState[race.id] === "loading" ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Award size={13} />
                        )}
                        {achievementState[race.id] === "loading"
                          ? admin.calculatingAchievements
                          : admin.recalculateAchievements}
                      </button>
                    )}

                    {/* Reset result */}
                    {((sessionType === "race" && race.hasRaceResult) ||
                      (sessionType === "sprint" && race.hasSprintResult)) && (
                      <button
                        onClick={() => handleResetResult(race.id, sessionType)}
                        disabled={resetResultState[`${race.id}-${sessionType}`] === "loading"}
                        className="flex items-center gap-1.5 rounded-lg bg-f1-red/15 px-3 py-2 text-xs font-medium text-f1-red transition-colors hover:bg-f1-red/25 disabled:opacity-50"
                      >
                        {resetResultState[`${race.id}-${sessionType}`] === "loading" ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        {resetResultState[`${race.id}-${sessionType}`] === "loading"
                          ? admin.resettingResult
                          : admin.resetResult}
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

                  {/* Achievement calculation status */}
                  {achievementMessages[race.id] && (
                    <div
                      className={`rounded-lg px-3 py-2 text-xs ${
                        achievementState[race.id] === "success"
                          ? "bg-f1-green/10 text-f1-green"
                          : achievementState[race.id] === "error"
                            ? "bg-f1-red/10 text-f1-red"
                            : ""
                      }`}
                    >
                      {achievementMessages[race.id]}
                    </div>
                  )}

                  {/* Reset result status */}
                  {resetResultMessages[`${race.id}-${sessionType}`] && (
                    <div
                      className={`rounded-lg px-3 py-2 text-xs ${
                        resetResultState[`${race.id}-${sessionType}`] === "success"
                          ? "bg-f1-green/10 text-f1-green"
                          : resetResultState[`${race.id}-${sessionType}`] === "error"
                            ? "bg-f1-red/10 text-f1-red"
                            : ""
                      }`}
                    >
                      {resetResultMessages[`${race.id}-${sessionType}`]}
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
                        router.refresh();
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
