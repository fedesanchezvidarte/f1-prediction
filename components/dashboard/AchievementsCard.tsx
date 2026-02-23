"use client";

import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";
import { getAchievementIcon } from "@/lib/achievements";
import type { Achievement } from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface AchievementsCardProps {
  earned: number[];
  achievements: Achievement[];
  total: number;
}

export function AchievementsCard({ earned, achievements, total }: AchievementsCardProps) {
  const { t } = useLanguage();
  const earnedSet = new Set(earned);
  const earnedCount = earned.length;

  const previewEarned = achievements
    .filter((a) => earnedSet.has(a.id))
    .slice(0, 3);

  return (
    <Link
      href="/achievements"
      className="group flex h-full flex-col justify-between p-5 transition-colors hover:bg-card-hover sm:p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {t.achievementsCard.achievements}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-f1-white">
            {earnedCount}
            <span className="text-sm font-normal text-muted">/{total}</span>
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-f1-purple/10">
          <Award size={20} className="text-f1-purple" />
        </div>
      </div>

      {previewEarned.length > 0 ? (
        <div className="mt-3 flex items-center gap-2">
          {previewEarned.map((a) => (
            <div
              key={a.id}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-card text-base ring-1 ring-border"
              title={a.name}
            >
              {getAchievementIcon(a.slug)}
            </div>
          ))}
          {earnedCount > 3 && (
            <span className="text-[10px] text-muted">+{earnedCount - 3} {t.achievementsCard.more}</span>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[10px] text-muted">
          {t.achievementsCard.noAchievements}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1 text-[10px] text-muted transition-colors group-hover:text-f1-white">
        {t.achievementsCard.viewAll}
        <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
