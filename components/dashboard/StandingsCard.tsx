"use client";

import { useState } from "react";
import { Trophy, ChevronRight } from "lucide-react";
import type { ChampionshipStandings } from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { StandingsModal } from "./StandingsModal";

interface StandingsCardProps {
  standings: ChampionshipStandings;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-f1-amber/15 text-[10px] font-bold text-f1-amber">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-400/15 text-[10px] font-bold text-gray-400">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/15 text-[10px] font-bold text-amber-700">
        3
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center text-[10px] text-muted">
      {rank}
    </span>
  );
}

export function StandingsCard({ standings }: StandingsCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useLanguage();

  const topFive = standings.wdc.slice(0, 5);
  const hasData = topFive.length > 0;

  return (
    <>
      <div className="flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-f1-amber" />
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              {t.standingsCard.title}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isModalOpen}
            className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[10px] font-medium text-muted transition-colors hover:text-f1-white"
          >
            {t.standingsCard.viewAll}
            <ChevronRight size={12} />
          </button>
        </div>

        {hasData ? (
          <div className="mt-3 flex-1 space-y-0.5">
            {topFive.map((entry) => (
              <div
                key={entry.driverId}
                className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-card-hover"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <RankBadge rank={entry.rank} />
                  <span
                    className="h-6 w-1 shrink-0 rounded-sm"
                    style={{ backgroundColor: `#${entry.driver.teamColor}` }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-medium text-f1-white">
                      {entry.driver.firstName.charAt(0)}. {entry.driver.lastName}
                    </span>
                    <span className="block truncate text-[10px] text-muted">
                      {entry.driver.teamName}
                    </span>
                  </div>
                </div>
                <span className="ml-2 shrink-0 text-xs font-semibold tabular-nums text-f1-white">
                  {entry.points}
                  <span className="ml-0.5 text-[10px] font-normal text-muted">
                    {t.standingsCard.pts}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-4">
            <p className="text-center text-[11px] text-muted">
              {t.standingsCard.noData}
            </p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <StandingsModal
          standings={standings}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
