"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Medal,
  List,
  Table2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
} from "lucide-react";
import type { DetailedLeaderboardEntry, Race } from "@/types";

type ViewMode = "simple" | "detailed";

interface LeaderboardContentProps {
  entries: DetailedLeaderboardEntry[];
  races: Race[];
  currentUserId?: string;
}

const PAGE_SIZE = 10;

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-f1-amber/15 text-xs font-bold text-f1-amber">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-400/15 text-xs font-bold text-gray-400">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700/15 text-xs font-bold text-amber-700">
        3
      </span>
    );
  return (
    <span className="flex h-7 w-7 items-center justify-center text-xs tabular-nums text-muted">
      {rank}
    </span>
  );
}

export function LeaderboardContent({
  entries,
  races,
  currentUserId,
}: LeaderboardContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("simple");
  const [selectedRace, setSelectedRace] = useState<number | "all">("all");
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);

  // Number of races that have at least one scored prediction (drives the "X/N" display)
  const totalScoredRaces = useMemo(() => {
    const scored = new Set<number>();
    for (const entry of entries) {
      for (const [key, pts] of Object.entries(entry.racePoints)) {
        if (pts !== null) scored.add(Number(key));
      }
    }
    return scored.size;
  }, [entries]);

  const sorted = useMemo(() => {
    if (selectedRace === "all") {
      // Preserve server-assigned ranks (handles ties correctly)
      return [...entries].sort((a, b) =>
        b.totalPoints !== a.totalPoints
          ? b.totalPoints - a.totalPoints
          : a.displayName.localeCompare(b.displayName)
      );
    }
    // For single-race filter, re-rank by that race's points
    return [...entries].sort((a, b) => {
      const aP = a.racePoints[selectedRace] ?? -1;
      const bP = b.racePoints[selectedRace] ?? -1;
      return bP - aP;
    });
  }, [entries, selectedRace]);

  // Re-assign ranks with tie support
  const ranked = useMemo(() => {
    const result: DetailedLeaderboardEntry[] = [];
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (selectedRace === "all") {
        // Use server rank (already tie-aware)
        result.push({ ...sorted[i] });
      } else {
        const pts = sorted[i].racePoints[selectedRace] ?? -1;
        const prevPts = i > 0 ? (sorted[i - 1].racePoints[selectedRace] ?? -1) : pts;
        if (i > 0 && pts < prevPts) currentRank = i + 1;
        result.push({ ...sorted[i], rank: currentRank });
      }
    }
    return result;
  }, [sorted, selectedRace]);

  const totalPages = Math.ceil(ranked.length / PAGE_SIZE);
  const pageEntries = ranked.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const selectedRaceLabel =
    selectedRace === "all"
      ? "All Races"
      : races.find((r) => r.meetingKey === selectedRace)?.circuitShortName ??
        "Race";

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <Medal size={18} className="text-f1-amber" />
          <h1 className="text-sm font-semibold text-f1-white">Leaderboard</h1>
          <span className="rounded-full bg-card px-2 py-0.5 text-[10px] tabular-nums text-muted">
            {entries.length} players
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-border">
            <button
              onClick={() => setViewMode("simple")}
              className={`flex items-center gap-1.5 rounded-l-lg px-3 py-1.5 text-[11px] font-medium transition-colors ${
                viewMode === "simple"
                  ? "bg-card-hover text-f1-white"
                  : "text-muted hover:text-f1-white"
              }`}
            >
              <List size={13} />
              Simple
            </button>
            <button
              onClick={() => setViewMode("detailed")}
              className={`flex items-center gap-1.5 rounded-r-lg border-l border-border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                viewMode === "detailed"
                  ? "bg-card-hover text-f1-white"
                  : "text-muted hover:text-f1-white"
              }`}
            >
              <Table2 size={13} />
              Detailed
            </button>
          </div>

          {/* Race Filter */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white"
            >
              <Filter size={13} />
              {selectedRaceLabel}
              <ChevronDown size={12} />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-xl">
                <button
                  onClick={() => {
                    setSelectedRace("all");
                    setFilterOpen(false);
                    setPage(0);
                  }}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-card-hover ${
                    selectedRace === "all"
                      ? "font-medium text-f1-white"
                      : "text-muted"
                  }`}
                >
                  All Races
                </button>
                {races.map((race) => (
                  <button
                    key={race.meetingKey}
                    onClick={() => {
                      setSelectedRace(race.meetingKey);
                      setFilterOpen(false);
                      setPage(0);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-card-hover ${
                      selectedRace === race.meetingKey
                        ? "font-medium text-f1-white"
                        : "text-muted"
                    }`}
                  >
                    R{race.round} — {race.circuitShortName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      {viewMode === "simple" ? (
        <SimpleTable
          entries={pageEntries}
          currentUserId={currentUserId}
          selectedRace={selectedRace}
          totalScoredRaces={totalScoredRaces}
        />
      ) : (
        <DetailedTable
          entries={pageEntries}
          races={races}
          currentUserId={currentUserId}
        />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
        <p className="text-[11px] tabular-nums text-muted">
          Showing {page * PAGE_SIZE + 1}–
          {Math.min((page + 1) * PAGE_SIZE, ranked.length)} of {ranked.length}
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted"
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-medium transition-colors ${
                page === i
                  ? "bg-f1-red text-white"
                  : "text-muted hover:bg-card-hover hover:text-f1-white"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={page === totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Simple View ---------- */

function SimpleTable({
  entries,
  currentUserId,
  selectedRace,
  totalScoredRaces,
}: {
  entries: DetailedLeaderboardEntry[];
  currentUserId?: string;
  selectedRace: number | "all";
  totalScoredRaces: number;
}) {
  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[2.5rem_1fr_5rem_4.5rem] items-center gap-2 border-b border-border bg-card/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted sm:grid-cols-[3rem_1fr_6rem_5rem] sm:px-5">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Predictions</span>
        <span className="text-right">Points</span>
      </div>
      {/* Rows */}
      {entries.map((entry) => {
        const isMe = entry.userId === currentUserId;
        const displayPoints =
          selectedRace === "all"
            ? entry.totalPoints
            : (entry.racePoints[selectedRace] ?? 0);
        return (
          <div
            key={entry.userId}
            className={`grid grid-cols-[2.5rem_1fr_5rem_4.5rem] items-center gap-2 border-b border-border px-4 py-2.5 text-xs transition-colors last:border-b-0 sm:grid-cols-[3rem_1fr_6rem_5rem] sm:px-5 ${
              isMe ? "bg-f1-red/5" : "hover:bg-card-hover"
            }`}
          >
            <RankBadge rank={entry.rank} />
            <Link
              href={`/race-prediction?user=${entry.userId}`}
              className={`font-medium transition-colors hover:text-f1-red ${isMe ? "text-f1-white" : "text-foreground"}`}
            >
              {entry.displayName}
              {isMe && (
                <span className="ml-1.5 text-[10px] text-f1-red">(You)</span>
              )}
            </Link>
            <span className="text-right tabular-nums text-muted">
              {entry.predictionsCount}/{totalScoredRaces}
            </span>
            <span className="text-right text-sm font-semibold tabular-nums text-f1-white">
              {displayPoints}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Detailed View ---------- */

function DetailedTable({
  entries,
  races,
  currentUserId,
}: {
  entries: DetailedLeaderboardEntry[];
  races: Race[];
  currentUserId?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-xs">
        <thead>
          <tr className="border-b border-border bg-card/50 text-[10px] font-semibold uppercase tracking-wider text-muted">
            <th className="sticky left-0 z-10 w-10 bg-card/95 px-4 py-2.5 text-left backdrop-blur-sm sm:px-5">
              #
            </th>
            <th className="sticky left-13 z-10 min-w-32 bg-card/95 px-2 py-2.5 pr-4 text-left backdrop-blur-sm">
              Player
            </th>
            {races.map((race) => (
              <th key={race.meetingKey} className="px-3 py-2.5 text-center">
                <div className="leading-tight">
                  <span className="text-muted">R{race.round}</span>
                  <br />
                  <span className="text-[9px] text-muted/70">
                    {race.countryCode}
                  </span>
                </div>
              </th>
            ))}
            <th className="px-4 py-2.5 text-right sm:px-5">Total</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isMe = entry.userId === currentUserId;
            return (
              <tr
                key={entry.userId}
                className={`border-b border-border transition-colors last:border-b-0 ${
                  isMe ? "bg-f1-red/5" : "hover:bg-card-hover"
                }`}
              >
                <td className="sticky left-0 z-10 w-10 bg-inherit px-4 py-2.5 sm:px-5">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="sticky left-13 z-10 min-w-32 bg-inherit px-2 py-2.5 pr-4">
                  <Link
                    href={`/race-prediction?user=${entry.userId}`}
                    className={`font-medium whitespace-nowrap transition-colors hover:text-f1-red ${
                      isMe ? "text-f1-white" : "text-foreground"
                    }`}
                  >
                    {entry.displayName}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] text-f1-red">
                        (You)
                      </span>
                    )}
                  </Link>
                </td>
                {races.map((race) => {
                  const pts = entry.racePoints[race.meetingKey];
                  return (
                    <td
                      key={race.meetingKey}
                      className="px-3 py-2.5 text-center tabular-nums"
                    >
                      {pts !== null && pts !== undefined ? (
                        <span className="text-foreground">{pts}</span>
                      ) : (
                        <span className="text-muted/40">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-f1-white sm:px-5">
                  {entry.totalPoints}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
