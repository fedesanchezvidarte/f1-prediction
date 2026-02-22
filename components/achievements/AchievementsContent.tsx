"use client";

import { useState } from "react";
import { Award, Lock, Check } from "lucide-react";
import {
  getAchievementIcon,
  getCategoryColors,
  CATEGORY_LABELS,
} from "@/lib/achievements";
import type { Achievement, AchievementCategory } from "@/types";

interface AchievementsContentProps {
  achievements: Achievement[];
  earnedIds: number[];
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
}: AchievementsContentProps) {
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | "all">("all");

  const earnedSet = new Set(earnedIds);
  const earnedCount = earnedIds.length;

  const filtered =
    activeCategory === "all"
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-f1-purple/10">
            <Award size={18} className="text-f1-purple" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-f1-white">Achievements</h1>
            <p className="text-[11px] text-muted">
              {earnedCount} of {achievements.length} unlocked
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
          label="All"
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

      {/* Achievements grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((achievement) => {
          const isEarned = earnedSet.has(achievement.id);
          const colors = getCategoryColors(achievement.category);

          return (
            <div
              key={achievement.id}
              className={`group relative overflow-hidden rounded-xl border transition-all ${
                isEarned
                  ? `${colors.border} bg-card hover:bg-card-hover`
                  : "border-border bg-card/50 opacity-60 hover:opacity-80"
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                    isEarned ? colors.bg : "bg-card"
                  }`}
                >
                  {isEarned ? (
                    getAchievementIcon(achievement.slug)
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
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Award size={24} className="text-muted/30" />
          <p className="text-sm text-muted">No achievements in this category</p>
        </div>
      )}
    </div>
  );
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
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors ${
        active
          ? "border-f1-purple/40 bg-f1-purple/10 text-f1-purple"
          : "border-border text-muted hover:border-border-hover hover:text-f1-white"
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
