import { Trophy, TrendingUp, Target, Zap } from "lucide-react";
import type { UserStats } from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface UserPointsCardProps {
  stats: UserStats;
}

export function UserPointsCard({ stats }: UserPointsCardProps) {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col justify-between p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            {t.userPoints.yourPoints}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-f1-white">
            {stats.totalPoints}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-f1-amber/10">
          <Trophy size={20} className="text-f1-amber" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
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
        <div className="flex items-center gap-2">
          <Target size={14} className="text-f1-blue" />
          <div>
            <p className="text-lg font-semibold tabular-nums text-f1-white">
              {stats.predictionsSubmitted}
            </p>
            <p className="text-[10px] text-muted">{t.userPoints.predictions}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-f1-purple" />
          <div>
            <p className="text-lg font-semibold tabular-nums text-f1-white">
              {stats.bestRacePoints}
            </p>
            <p className="text-[10px] text-muted">{t.userPoints.bestRace}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
