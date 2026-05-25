"use client";

import { useState } from "react";
import { Award, Lock, Check, Construction } from "lucide-react";
import {
  getAchievementIcon,
  getCategoryColors,
  CATEGORY_LABELS,
} from "@/lib/achievements";
import type { Achievement, AchievementCategory } from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface AchievementsContentProps {
  achievements: Achievement[];
  earnedIds: number[];
  progressMap?: Record<number, { current: number; max: number }>;
}

const CATEGORIES: AchievementCategory[] = [
  "predictions",
  "accuracy",
  "milestones",
  "special",
];

export function AchievementsContent({
  achievements,
  earnedIds,
  progressMap = {},
}: AchievementsContentProps) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");
  const { t } = useLanguage();

  const earnedSet = new Set(earnedIds);
  const earnedCount = earnedIds.length;

  const filtered =
    activeCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-f1-purple/10">
            <Award size={18} className="text-f1-purple" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-f1-white">{t.achievementsPage.title}</h1>
            <p className="text-[11px] text-muted">
              {earnedCount} {t.achievementsPage.of} {achievements.length} {t.achievementsPage.unlocked}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-5 py-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-card">
            <div
              className="h-full rounded-full bg-f1-purple transition-all duration-500"
              style={{
                width: `${achievements.length > 0 ? (earnedCount / achievements.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          label={t.achievementsPage.all}
          count={achievements.length}
        />
        {CATEGORIES.map((cat) => {
          const count = achievements.filter((a) => a.category === cat).length;
          return (
            <FilterButton
              key={cat}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              label={CATEGORY_LABELS[cat]}
              count={count}
            />
          );
        })}
      </div>

      {/* Achievements bento grid */}
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((achievement, index) => {
              const isEarned = earnedSet.has(achievement.id);
              const colors = getCategoryColors(achievement.category);
              const AchievementIcon = getAchievementIcon(achievement.slug);
              const borderClasses = getBentoCellBorderClasses(index, filtered.length + 1);

              return (
                <div
                  key={achievement.id}
                  className={`group relative transition-colors ${borderClasses} ${
                    isEarned ? "hover:bg-card-hover/40" : "hover:bg-card/30"
                  }`}
                >
                  <div className={`flex items-start gap-3 p-4 ${isEarned ? "" : "opacity-60"}`}>
                    {/* Icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isEarned ? colors.bg : "bg-card"
                      }`}
                    >
                      {isEarned ? (
                        <AchievementIcon size={18} className={colors.text} />
                      ) : (
                        <Lock size={16} className="text-muted/40" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs font-semibold ${
                            isEarned ? "text-f1-white" : "text-muted"
                          }`}
                        >
                          {achievement.name}
                        </p>
                        {isEarned && (
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-f1-green/20">
                            <Check size={10} className="text-f1-green" />
                          </div>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                        {achievement.description}
                      </p>
                      <span
                        className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${colors.bg} ${colors.text}`}
                      >
                        {CATEGORY_LABELS[achievement.category]}
                      </span>
                      {/* Progress bar - only on locked cards */}
                      {!isEarned && progressMap[achievement.id] && (() => {
                        const { current, max } = progressMap[achievement.id];
                        const fill = Math.min(current / max, 1) * 100;
                        return (
                          <div className="mt-2 space-y-0.5">
                            <div className="h-1 w-full overflow-hidden rounded-full bg-card">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${colors.bg}`}
                                style={{ width: `${fill}%` }}
                              />
                            </div>
                            <p className={`text-right text-[9px] tabular-nums ${colors.text}`}>
                              {current} / {max}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Still cooking placeholder cell */}
            <div
              className={`flex flex-col items-center justify-center gap-2 p-5 sm:p-6 ${getBentoCellBorderClasses(
                filtered.length,
                filtered.length + 1,
              )}`}
            >
              <Construction size={20} className="text-muted/40" />
              <p className="text-[10px] text-muted/40">{t.placeholder.stillCooking}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Award size={24} className="text-muted/30" />
            <p className="text-sm text-muted">{t.achievementsPage.noAchievements}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Computes border classes for a cell in a 1/2/3-column responsive bento grid.
// `border-border` is set unconditionally so the responsive border-* utilities
// don't fall back to currentColor (which would render solid white/black).
function getBentoCellBorderClasses(index: number, total: number) {
  const smCols = 2;
  const lgCols = 3;
  const smIsLastRow = index >= total - (total % smCols === 0 ? smCols : total % smCols);
  const lgIsLastRow = index >= total - (total % lgCols === 0 ? lgCols : total % lgCols);
  const smIsRightCol = index % smCols === smCols - 1;
  const lgIsRightCol = index % lgCols === lgCols - 1;
  const isLastItem = index === total - 1;

  return [
    "border-border",
    !isLastItem ? "border-b" : "",
    smIsLastRow ? "sm:border-b-0" : "sm:border-b",
    smIsRightCol ? "sm:border-r-0" : "sm:border-r",
    lgIsLastRow ? "lg:border-b-0" : "lg:border-b",
    lgIsRightCol ? "lg:border-r-0" : "lg:border-r",
  ]
    .filter(Boolean)
    .join(" ");
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-f1-purple/40 text-f1-purple"
          : "border-border text-muted hover:border-border-hover hover:bg-card hover:text-f1-white"
      }`}
    >
      {label}
      <span
        className={`rounded-md px-1 py-0.5 text-[9px] tabular-nums ${
          active ? "bg-f1-purple/20 text-f1-purple" : "bg-card text-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
