"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Radio, MapPin, ChevronRight } from "lucide-react";
import type { Race } from "@/types";
import { getRaceStatus } from "@/lib/race-utils";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { CountryFlag } from "@/components/ui/CountryFlag";

interface NextRaceCountdownProps {
  race: Race;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold tabular-nums text-f1-white">
        {String(value).padStart(2, "0")}
      </p>
      <p className="text-[10px] uppercase text-muted">{label}</p>
    </div>
  );
}

function getActiveDeadline(race: Race): string {
  const now = Date.now();
  const sprintDeadline = race.sprintDateEnd ? new Date(race.sprintDateEnd).getTime() : null;
  return sprintDeadline && sprintDeadline > now
    ? race.sprintDateEnd!
    : race.dateEnd;
}

/**
 * Returns the appropriate prediction-page tab for the CTA, or null if both deadlines have passed.
 * Sprint deep-link only when the sprint deadline is still upcoming AND it lands before the race deadline.
 */
function getCtaTab(race: Race): "sprint" | "race" | null {
  const now = Date.now();
  const raceDeadline = new Date(race.dateEnd).getTime();
  const sprintDeadline = race.sprintDateEnd ? new Date(race.sprintDateEnd).getTime() : null;

  const raceUpcoming = raceDeadline > now;
  const sprintUpcoming = sprintDeadline !== null && sprintDeadline > now;

  if (sprintUpcoming && (raceDeadline === null || sprintDeadline! < raceDeadline)) {
    return "sprint";
  }
  if (raceUpcoming) return "race";
  return null;
}

export function NextRaceCountdown({ race }: NextRaceCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(
    () => calculateTimeLeft(getActiveDeadline(race))
  );
  const [status, setStatus] = useState(() => getRaceStatus(race));
  const [deadlinePassed, setDeadlinePassed] = useState(
    () => new Date(getActiveDeadline(race)).getTime() <= Date.now()
  );
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => {
      const dl = getActiveDeadline(race);
      setTimeLeft(calculateTimeLeft(dl));
      setStatus(getRaceStatus(race));
      setDeadlinePassed(new Date(dl).getTime() <= Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [race]);

  const isWeekendLive = status === "live";

  return (
    <div className={`flex h-full flex-col justify-between p-5 sm:p-6 transition-colors`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {deadlinePassed
            ? t.nextRace.raceWeekend
            : isWeekendLive
              ? t.nextRace.raceWeekend
              : t.nextRace.nextRace}
        </p>
        {deadlinePassed || isWeekendLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-f1-red/15 px-2.5 py-1 text-[10px] font-semibold uppercase text-f1-red">
            <Radio size={10} className="animate-pulse" />
            {t.nextRace.live}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-f1-green/15 px-2.5 py-1 text-[10px] font-semibold uppercase text-f1-green">
            <Clock size={10} />
            {t.nextRace.upcoming}
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <CountryFlag countryCode={race.countryCode} className="inline-block h-3.5 w-5 rounded-[1px] shrink-0" />
          <p className="text-sm font-semibold text-f1-white">{race.raceName}</p>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted">
          <MapPin size={12} />
          {race.location}, {race.countryName}
        </div>
      </div>

      {!deadlinePassed && (
        <div className="mt-4">
          <div className="flex justify-between gap-2 px-3 py-2 md:justify-center md:gap-4 md:px-0">
            <TimeUnit value={timeLeft.days} label={t.nextRace.days} />
            <span className="self-start pt-1 text-lg text-muted">:</span>
            <TimeUnit value={timeLeft.hours} label={t.nextRace.hrs} />
            <span className="self-start pt-1 text-lg text-muted">:</span>
            <TimeUnit value={timeLeft.minutes} label={t.nextRace.min} />
            <span className="self-start pt-1 text-lg text-muted">:</span>
            <TimeUnit value={timeLeft.seconds} label={t.nextRace.sec} />
          </div>
          <p className="mb-2 text-center text-[10px]">
            {t.nextRace.predictionDeadline}
          </p>
        </div>
      )}

      {deadlinePassed && (
        <div className="mt-4 rounded-lg bg-f1-red/5 px-3 py-3 text-center">
          <p className="text-sm font-medium text-f1-white">
            {t.nextRace.lightsOut}
          </p>
        </div>
      )}

      <PredictionCta race={race} />
    </div>
  );
}

function PredictionCta({ race }: { race: Race }) {
  const { t } = useLanguage();
  const [ctaTab, setCtaTab] = useState<"sprint" | "race" | null>(() => getCtaTab(race));

  useEffect(() => {
    const timer = setInterval(() => {
      setCtaTab(getCtaTab(race));
    }, 1000);
    return () => clearInterval(timer);
  }, [race]);

  if (ctaTab === null) return null;

  const href =
    ctaTab === "sprint"
      ? `/race-prediction?round=${race.round}&tab=sprint`
      : `/race-prediction?round=${race.round}`;

  return (
    <Link
      href={href}
      className="mt-3 flex items-center justify-center gap-1 rounded-md bg-f1-red/10 py-2 text-xs font-medium text-f1-red transition-colors hover:bg-f1-red/20"
    >
      {t.nextRace.makePrediction}
      <ChevronRight size={14} />
    </Link>
  );
}
