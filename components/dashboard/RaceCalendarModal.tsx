"use client";

import { X, Zap } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { RaceCalendarEntry } from "@/lib/race-utils";
import { CountryFlag } from "@/components/ui/CountryFlag";

interface RaceCalendarModalProps {
  entries: RaceCalendarEntry[];
  onClose: () => void;
}

export function RaceCalendarModal({ entries, onClose }: RaceCalendarModalProps) {
  const { t } = useLanguage();
  const nextRaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Auto-scroll to the next upcoming / live race after mount
  useEffect(() => {
    if (nextRaceRef.current) {
      nextRaceRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, []);

  // Determine the first non-completed race to highlight
  const nextEntryIndex = entries.findIndex(
    (e) => e.raceStatus === "live" || e.raceStatus === "upcoming",
  );

  // Derive season year from first race
  const seasonYear = entries.length > 0
    ? new Date(entries[0].race.dateStart).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card">
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-bold text-f1-white">
            {t.raceCalendar.modalTitle.replace("{{year}}", String(seasonYear))}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
            aria-label={t.raceCalendar.closeModal}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Race list ── */}
        <div className="space-y-1 p-4">
          {entries.map((entry, index) => {
            const { race, raceStatus, predictionStatus } = entry;
            const isNext = index === nextEntryIndex;
            const isCompleted = raceStatus === "completed";
            const isLive = raceStatus === "live";

            const dateStr = formatLocalDate(race.dateStart, race.dateEnd);

            return (
              <div
                key={race.meetingKey}
                ref={isNext ? nextRaceRef : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  isNext
                    ? "border border-f1-red/30 bg-f1-red/5"
                    : isCompleted
                      ? "opacity-50"
                      : ""
                }`}
              >
                {/* Round number */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    isLive
                      ? "bg-f1-red text-white"
                      : isNext
                        ? "bg-f1-red/20 text-f1-red"
                        : "bg-card-hover text-muted"
                  }`}
                >
                  {race.round}
                </div>

                {/* Race info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <CountryFlag countryCode={race.countryCode} className="inline-block h-3 w-4 rounded-[1px]" />
                    <p className="truncate text-xs font-medium text-f1-white">
                      {race.raceName}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {race.circuitShortName} · {dateStr}
                  </p>
                </div>

                {/* Right side: badges */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {race.hasSprint && (
                    <span className="flex items-center gap-0.5 rounded-full bg-f1-purple/10 px-1.5 py-0.5 text-[9px] font-semibold text-f1-purple">
                      <Zap size={10} />
                      {t.raceCalendar.sprint}
                    </span>
                  )}

                  {isLive && (
                    <span className="flex items-center gap-1 rounded-full bg-f1-red/10 px-2 py-0.5 text-[9px] font-semibold text-f1-red">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-f1-red" />
                      {t.raceCalendar.live}
                    </span>
                  )}

                  {!isLive && predictionStatus && (
                    <PredictionBadge status={predictionStatus} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Prediction status badge ── */
function PredictionBadge({ status }: { status: "pending" | "submitted" | "scored" }) {
  const { t } = useLanguage();
  const config = {
    pending: { label: t.predictionsCard.pending, cls: "bg-f1-amber/10 text-f1-amber" },
    submitted: { label: t.predictionsCard.submitted, cls: "bg-f1-blue/10 text-f1-blue" },
    scored: { label: t.predictionsCard.scored, cls: "bg-f1-green/10 text-f1-green" },
  };
  const { label, cls } = config[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

/* ── Date formatting ── */
function formatLocalDate(dateStart: string, dateEnd: string): string {
  const start = new Date(dateStart);
  const end = new Date(dateEnd);

  const dayFmt = new Intl.DateTimeFormat(undefined, { day: "numeric" });
  const monthFmt = new Intl.DateTimeFormat(undefined, { month: "short" });

  const startDay = dayFmt.format(start);
  const endDay = dayFmt.format(end);
  const month = monthFmt.format(end);

  if (startDay === endDay) return `${startDay} ${month}`;
  return `${startDay}–${endDay} ${month}`;
}
