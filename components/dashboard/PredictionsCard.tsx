import Link from "next/link";
import {
  FileText,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Radio,
} from "lucide-react";
import type { Race, RacePrediction } from "@/types";
import { getRaceStatus } from "@/lib/dummy-data";

interface PredictionsCardProps {
  predictions: RacePrediction[];
  races: (Race | null)[];
}

function PredictionStatusBadge({ status }: { status: RacePrediction["status"] }) {
  if (status === "submitted") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-f1-green/15 px-2 py-0.5 text-[10px] font-medium text-f1-green">
        <CheckCircle2 size={10} />
        Submitted
      </span>
    );
  }
  if (status === "scored") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-f1-purple/15 px-2 py-0.5 text-[10px] font-medium text-f1-purple">
        <CheckCircle2 size={10} />
        Scored
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-f1-amber/15 px-2 py-0.5 text-[10px] font-medium text-f1-amber">
      <AlertCircle size={10} />
      Pending
    </span>
  );
}

function RaceSlot({
  race,
  prediction,
}: {
  race: Race | null;
  prediction: RacePrediction | undefined;
}) {
  if (!race) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-3">
        <span className="text-[10px] text-muted/40">—</span>
      </div>
    );
  }

  const status = getRaceStatus(race);
  const isLive = status === "live";

  return (
    <div className="rounded-lg border border-border p-3 transition-colors hover:border-border-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {isLive && (
              <span className="flex items-center gap-1 rounded-full bg-f1-red/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-f1-red">
                <Radio size={8} />
                Live
              </span>
            )}
            <p className="truncate text-xs font-medium text-f1-white">
              R{race.round} · {race.circuitShortName}
            </p>
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted">
            {race.raceName.replace(" Grand Prix", " GP")}
          </p>
        </div>
        {prediction && <PredictionStatusBadge status={prediction.status} />}
      </div>

      {prediction?.status === "scored" && prediction.pointsEarned != null && (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-[10px] text-muted">Points earned</span>
          <span className="text-xs font-semibold text-f1-green">
            +{prediction.pointsEarned}
          </span>
        </div>
      )}
      {(!prediction || prediction.status === "pending") && (
        <Link
          href="/race-prediction"
          className="mt-2 block w-full rounded-md bg-f1-red/10 py-1.5 text-center text-[10px] font-medium text-f1-red transition-colors hover:bg-f1-red/20"
        >
          Make Prediction
        </Link>
      )}
    </div>
  );
}

export function PredictionsCard({ predictions, races }: PredictionsCardProps) {
  return (
    <div className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-f1-blue" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Predictions
          </p>
        </div>
        <Link
          href="/race-prediction"
          className="flex items-center gap-0.5 text-[10px] font-medium text-muted transition-colors hover:text-f1-white"
        >
          View all
          <ChevronRight size={12} />
        </Link>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-2">
        {races.map((race, i) => {
          const prediction = race
            ? predictions.find((p) => p.raceId === race.meetingKey)
            : undefined;
          return (
            <RaceSlot
              key={race ? race.meetingKey : `empty-${i}`}
              race={race}
              prediction={prediction}
            />
          );
        })}
      </div>
    </div>
  );
}
