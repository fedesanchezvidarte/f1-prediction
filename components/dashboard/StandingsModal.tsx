"use client";

import { X, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import type {
  ChampionshipStandings,
  ConstructorStanding,
  DriverStanding,
  StatLeader,
} from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";

type StandingsTab = "wdc" | "wcc" | "stats";

interface StandingsModalProps {
  standings: ChampionshipStandings;
  onClose: () => void;
}

const STANDINGS_QUERY_KEY = "standings";
const TABS: readonly StandingsTab[] = ["wdc", "wcc", "stats"] as const;

function isStandingsTab(value: string | null): value is StandingsTab {
  return value === "wdc" || value === "wcc" || value === "stats";
}

function readTabFromUrl(): StandingsTab {
  if (typeof window === "undefined") return "wdc";
  const param = new URLSearchParams(window.location.search).get(STANDINGS_QUERY_KEY);
  return isStandingsTab(param) ? param : "wdc";
}

function writeTabToUrl(tab: StandingsTab) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set(STANDINGS_QUERY_KEY, tab);
  window.history.replaceState(null, "", url.toString());
}

function clearTabFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete(STANDINGS_QUERY_KEY);
  window.history.replaceState(null, "", url.toString());
}

export function StandingsModal({ standings, onClose }: StandingsModalProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<StandingsTab>(() => readTabFromUrl());
  const tabRefs = useRef<Record<StandingsTab, HTMLButtonElement | null>>({
    wdc: null,
    wcc: null,
    stats: null,
  });

  // Sync the URL when the modal mounts (in case the deep-link param was set before opening).
  useEffect(() => {
    writeTabToUrl(activeTab);
    // We only want to write the initial value once on mount; subsequent changes go
    // through handleTabChange which also writes to the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = useCallback(() => {
    clearTabFromUrl();
    onClose();
  }, [onClose]);

  const handleTabChange = useCallback((tab: StandingsTab) => {
    setActiveTab(tab);
    writeTabToUrl(tab);
  }, []);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentTab: StandingsTab) => {
      const currentIndex = TABS.indexOf(currentTab);
      let nextIndex: number | null = null;
      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = TABS.length - 1;
      }
      if (nextIndex !== null) {
        e.preventDefault();
        const nextTab = TABS[nextIndex];
        handleTabChange(nextTab);
        tabRefs.current[nextTab]?.focus();
      }
    },
    [handleTabChange]
  );

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="standings-modal-title"
        className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="standings-modal-title" className="text-lg font-bold text-f1-white">
            {t.standingsModal.title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
            aria-label={t.standingsModal.closeModal}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex border-b border-border"
          role="tablist"
          aria-label={t.standingsModal.title}
        >
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[tab] = el;
                }}
                type="button"
                role="tab"
                id={`standings-tab-${tab}`}
                aria-selected={isActive}
                aria-controls={`standings-panel-${tab}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleTabChange(tab)}
                onKeyDown={(e) => handleTabKeyDown(e, tab)}
                className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-b-2 border-f1-red text-f1-white"
                    : "border-b-2 border-transparent text-muted hover:text-f1-white"
                }`}
              >
                {t.standingsModal.tabs[tab]}
              </button>
            );
          })}
        </div>

        {/* Tab Panel */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "wdc" && (
            <DriversPanel entries={standings.wdc} />
          )}
          {activeTab === "wcc" && (
            <ConstructorsPanel entries={standings.wcc} />
          )}
          {activeTab === "stats" && (
            <StatsPanel stats={standings.stats} />
          )}
        </div>
      </div>
    </div>
  );
}

function DriversPanel({ entries }: { entries: DriverStanding[] }) {
  const { t } = useLanguage();

  if (entries.length === 0) {
    return (
      <div
        role="tabpanel"
        id="standings-panel-wdc"
        aria-labelledby="standings-tab-wdc"
        className="p-6 text-center text-sm text-muted"
      >
        {t.standingsModal.empty}
      </div>
    );
  }

  return (
    <div
      role="tabpanel"
      id="standings-panel-wdc"
      aria-labelledby="standings-tab-wdc"
      className="divide-y divide-border"
    >
      <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3.5rem] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted">
        <span>{t.standingsModal.rank}</span>
        <span>{t.standingsModal.driver}</span>
        <span className="text-right">{t.standingsModal.wins}</span>
        <span className="text-right">{t.standingsModal.podiums}</span>
        <span className="text-right">{t.standingsModal.points}</span>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.driverId}
          className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3.5rem] items-center gap-2 px-4 py-2.5"
        >
          <span className="text-xs font-bold tabular-nums text-f1-white">
            {entry.rank}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-6 w-1 shrink-0 rounded-sm"
              style={{ backgroundColor: `#${entry.driver.teamColor}` }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <span className="block truncate text-xs font-medium text-f1-white">
                {entry.driver.firstName} {entry.driver.lastName}
              </span>
              <span className="block truncate text-[10px] text-muted">
                {entry.driver.teamName}
              </span>
            </div>
          </div>
          <span className="text-right text-xs tabular-nums text-muted">
            {entry.wins}
          </span>
          <span className="text-right text-xs tabular-nums text-muted">
            {entry.podiums}
          </span>
          <span className="text-right text-xs font-semibold tabular-nums text-f1-white">
            {entry.points}
          </span>
        </div>
      ))}
    </div>
  );
}

function ConstructorsPanel({ entries }: { entries: ConstructorStanding[] }) {
  const { t } = useLanguage();

  if (entries.length === 0) {
    return (
      <div
        role="tabpanel"
        id="standings-panel-wcc"
        aria-labelledby="standings-tab-wcc"
        className="p-6 text-center text-sm text-muted"
      >
        {t.standingsModal.empty}
      </div>
    );
  }

  return (
    <div
      role="tabpanel"
      id="standings-panel-wcc"
      aria-labelledby="standings-tab-wcc"
      className="divide-y divide-border"
    >
      <div className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3.5rem] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-muted">
        <span>{t.standingsModal.rank}</span>
        <span>{t.standingsModal.team}</span>
        <span className="text-right">{t.standingsModal.wins}</span>
        <span className="text-right">{t.standingsModal.podiums}</span>
        <span className="text-right">{t.standingsModal.points}</span>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.teamId}
          className="grid grid-cols-[2rem_1fr_3.5rem_3.5rem_3.5rem] items-center gap-2 px-4 py-2.5"
        >
          <span className="text-xs font-bold tabular-nums text-f1-white">
            {entry.rank}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="h-6 w-1 shrink-0 rounded-sm"
              style={{ backgroundColor: `#${entry.teamColor}` }}
              aria-hidden="true"
            />
            <span className="block truncate text-xs font-medium text-f1-white">
              {entry.teamName}
            </span>
          </div>
          <span className="text-right text-xs tabular-nums text-muted">
            {entry.wins}
          </span>
          <span className="text-right text-xs tabular-nums text-muted">
            {entry.podiums}
          </span>
          <span className="text-right text-xs font-semibold tabular-nums text-f1-white">
            {entry.points}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatsPanel({
  stats,
}: {
  stats: { mostWins: StatLeader | null; mostPodiums: StatLeader | null; mostDnfs: StatLeader | null };
}) {
  const { t } = useLanguage();

  const hasAny = stats.mostWins || stats.mostPodiums || stats.mostDnfs;
  if (!hasAny) {
    return (
      <div
        role="tabpanel"
        id="standings-panel-stats"
        aria-labelledby="standings-tab-stats"
        className="p-6 text-center text-sm text-muted"
      >
        {t.standingsModal.empty}
      </div>
    );
  }

  return (
    <div
      role="tabpanel"
      id="standings-panel-stats"
      aria-labelledby="standings-tab-stats"
      className="space-y-3 p-4"
    >
      <StatRow
        icon={<Trophy size={14} className="text-f1-amber" />}
        label={t.standingsModal.mostWins}
        leader={stats.mostWins}
      />
      <StatRow
        icon={<TrendingUp size={14} className="text-f1-green" />}
        label={t.standingsModal.mostPodiums}
        leader={stats.mostPodiums}
      />
      <StatRow
        icon={<AlertTriangle size={14} className="text-f1-red" />}
        label={t.standingsModal.mostDnfs}
        leader={stats.mostDnfs}
      />
    </div>
  );
}

function StatRow({
  icon,
  label,
  leader,
}: {
  icon: React.ReactNode;
  label: string;
  leader: StatLeader | null;
}) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card-hover/30 px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
      </div>
      {leader ? (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-xs font-semibold text-f1-white">
              {leader.driver.firstName} {leader.driver.lastName}
            </span>
            <span
              className="block text-[10px]"
              style={{ color: `#${leader.driver.teamColor}` }}
            >
              {leader.driver.teamName}
            </span>
          </div>
          <span className="rounded-full bg-f1-red/10 px-2.5 py-0.5 text-xs font-bold tabular-nums text-f1-red">
            {leader.count}
          </span>
        </div>
      ) : (
        <span className="text-xs text-muted">{t.standingsModal.empty}</span>
      )}
    </div>
  );
}
