"use client";

import { useState, useEffect } from "react";
import { Clock, Radio, MapPin } from "lucide-react";
import type { Race } from "@/types";
import { getRaceStatus } from "@/lib/dummy-data";

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

export function NextRaceCountdown({ race }: NextRaceCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(
    calculateTimeLeft(race.dateStart)
  );
  const [status, setStatus] = useState(getRaceStatus(race));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(race.dateStart));
      setStatus(getRaceStatus(race));
    }, 1000);
    return () => clearInterval(timer);
  }, [race]);

  const isLive = status === "live";

  return (
    <div className="flex h-full flex-col justify-between p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {isLive ? "Race Weekend" : "Next Race"}
        </p>
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-f1-red/15 px-2.5 py-1 text-[10px] font-semibold uppercase text-f1-red">
            <Radio size={10} className="animate-pulse" />
            Live
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-f1-green/15 px-2.5 py-1 text-[10px] font-semibold uppercase text-f1-green">
            <Clock size={10} />
            Upcoming
          </span>
        )}
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-f1-white">{race.raceName}</p>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted">
          <MapPin size={12} />
          {race.location}, {race.countryName}
        </div>
      </div>

      {!isLive && (
        <div className="mt-4 flex justify-between gap-2 rounded-lg bg-background/50 px-3 py-2">
          <TimeUnit value={timeLeft.days} label="Days" />
          <span className="self-start pt-1 text-lg text-muted">:</span>
          <TimeUnit value={timeLeft.hours} label="Hrs" />
          <span className="self-start pt-1 text-lg text-muted">:</span>
          <TimeUnit value={timeLeft.minutes} label="Min" />
          <span className="self-start pt-1 text-lg text-muted">:</span>
          <TimeUnit value={timeLeft.seconds} label="Sec" />
        </div>
      )}

      {isLive && (
        <div className="mt-4 rounded-lg bg-f1-red/5 px-3 py-3 text-center">
          <p className="text-sm font-medium text-f1-white">
            Lights out, and a way we go!
          </p>
        </div>
      )}
    </div>
  );
}
