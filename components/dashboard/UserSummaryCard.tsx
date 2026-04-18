"use client";

import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { getAchievementIcon } from "@/lib/achievements";
import type { Achievement, UserStats } from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface UserSummaryCardProps {
  stats: UserStats;
  earned: number[];
  achievements: Achievement[];
  total: number;
}

export function UserSummaryCard({ stats, earned, achievements, total }: UserSummaryCardProps) {
  const { t } = useLanguage();
  const earnedSet = new Set(earned);
  const earnedCount = earned.length;

  const previewEarned = achievements
    .filter((a) => earnedSet.has(a.id))
    .slice(0, 3);

  return (
    <div className="flex h-full gap-4 p-5 sm:p-6">
      {/* Left: Points + Rank */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {t.userPoints.yourPoints}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-f1-white">
            {stats.totalPoints}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-f1-green" />
          <div>
            <p className="text-lg font-semibold tabular-nums text-f1-white">
              {stats.rank}
              <span className="text-xs text-muted">/{stats.totalUsers}</span>
            </p>
            <p className="text-[10px] text-muted">{t.userPoints.rank}</p>
          </div>
        </div>
      </div>

      {/* Right: Achievements (aligned right) */}
      <div className="flex flex-1 flex-col justify-between">
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {t.achievementsCard.achievements}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-f1-white">
            {earnedCount}
            <span className="text-sm font-normal text-muted">/{total}</span>
          </p>
        </div>

        <div>
          {previewEarned.length > 0 ? (
            <div className="flex items-center justify-end gap-2">
              {earnedCount > 3 && (
                <span className="text-[10px] text-muted">
                  +{earnedCount - 3} {t.achievementsCard.more}
                </span>
              )}
              {previewEarned.map((a) => {
                const PreviewIcon = getAchievementIcon(a.slug);
                return (
                  <div
                    key={a.id}
                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-card ring-1 ring-border"
                    title={a.name}
                  >
                    <PreviewIcon size={14} className="text-muted" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-right text-[10px] text-muted">
              {t.achievementsCard.noAchievements}
            </p>
          )}

          <Link
            href="/achievements"
            className="group mt-2 flex items-center justify-end gap-0.5 text-[10px] font-medium text-muted transition-colors hover:text-f1-white"
          >
            {t.achievementsCard.viewAll}
            <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
