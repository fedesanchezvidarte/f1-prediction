import Link from "next/link";
import { Medal, ChevronRight } from "lucide-react";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardCardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-f1-amber/15 text-[10px] font-bold text-f1-amber">
        1
      </span>
    );
  if (rank === 2)
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-400/15 text-[10px] font-bold text-gray-400">
        2
      </span>
    );
  if (rank === 3)
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700/15 text-[10px] font-bold text-amber-700">
        3
      </span>
    );
  return (
    <span className="flex h-6 w-6 items-center justify-center text-[10px] text-muted">
      {rank}
    </span>
  );
}

export function LeaderboardCard({
  entries,
  currentUserId,
}: LeaderboardCardProps) {
  return (
    <div className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Medal size={16} className="text-f1-amber" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Leaderboard
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="flex items-center gap-0.5 text-[10px] font-medium text-muted transition-colors hover:text-f1-white"
        >
          View all
          <ChevronRight size={12} />
        </Link>
      </div>

      <div className="mt-3 flex-1 space-y-0.5 overflow-y-auto">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={`flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
              entry.userId === currentUserId
                ? "bg-f1-red/8"
                : "hover:bg-card-hover"
            }`}
          >
            <div className="flex items-center gap-2">
              <RankBadge rank={entry.rank} />
              <span
                className={`text-xs font-medium ${
                  entry.userId === currentUserId
                    ? "text-f1-white"
                    : "text-muted"
                }`}
              >
                {entry.displayName}
                {entry.userId === currentUserId && (
                  <span className="ml-1 text-[10px] text-f1-red">(You)</span>
                )}
              </span>
            </div>
            <span className="text-xs font-semibold tabular-nums text-f1-white">
              {entry.totalPoints}
              <span className="ml-0.5 text-[10px] font-normal text-muted">
                pts
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
