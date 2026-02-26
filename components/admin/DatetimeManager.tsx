"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Download,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface DatetimeManagerProps {
  raceId: number;
  dateStart: string;
  dateEnd: string;
  /** Called with the updated datetimes after a successful save or restore */
  onUpdate?: (dateStart: string, dateEnd: string) => void;
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

/** Format an ISO datetime string to `YYYY-MM-DDTHH:mm` for datetime-local inputs */
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Format an ISO datetime string to a readable local string with timezone abbreviation */
function toReadableLocal(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function getEventStatus(dateStart: string, dateEnd: string): "upcoming" | "live" | "completed" {
  const now = Date.now();
  const start = new Date(dateStart).getTime();
  const end = new Date(dateEnd).getTime();
  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "completed";
}

export function DatetimeManager({
  raceId,
  dateStart: initialDateStart,
  dateEnd: initialDateEnd,
  onUpdate,
}: DatetimeManagerProps) {
  const { t } = useLanguage();
  const dt = t.admin.datetimeManager;

  // "Saved" datetimes — updated after a successful save or restore
  const [savedStart, setSavedStart] = useState(initialDateStart);
  const [savedEnd, setSavedEnd] = useState(initialDateEnd);

  // Controlled input values in datetime-local format (what the admin types)
  const [inputStart, setInputStart] = useState(toDatetimeLocalValue(initialDateStart));
  const [inputEnd, setInputEnd] = useState(toDatetimeLocalValue(initialDateEnd));

  const [saveState, setSaveState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState("");
  const [restoreState, setRestoreState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [restoreMsg, setRestoreMsg] = useState("");

  // Countdown — based on savedStart/savedEnd so it updates after a save/restore
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(savedStart));
  const [eventStatus, setEventStatus] = useState(getEventStatus(savedStart, savedEnd));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(savedStart));
      setEventStatus(getEventStatus(savedStart, savedEnd));
    }, 1000);
    return () => clearInterval(timer);
  }, [savedStart, savedEnd]);

  async function handleSave() {
    setSaveState("loading");
    setSaveMsg("");

    // Convert local datetime-local value back to ISO string
    const newStart = new Date(inputStart).toISOString();
    const newEnd = new Date(inputEnd).toISOString();

    try {
      const res = await fetch("/api/races/update-datetime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId, dateStart: newStart, dateEnd: newEnd }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSaveState("success");
        setSaveMsg(dt.saveSuccess);
        setSavedStart(newStart);
        setSavedEnd(newEnd);
        onUpdate?.(newStart, newEnd);
      } else {
        setSaveState("error");
        setSaveMsg(data.error || dt.saveError);
      }
    } catch {
      setSaveState("error");
      setSaveMsg(dt.saveError);
    }
  }

  async function handleRestoreFromOpenF1() {
    setRestoreState("loading");
    setRestoreMsg("");

    try {
      const res = await fetch("/api/races/fetch-openf1-datetime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRestoreState("success");
        setRestoreMsg(dt.restoreSuccess);
        setSavedStart(data.dateStart);
        setSavedEnd(data.dateEnd);
        setInputStart(toDatetimeLocalValue(data.dateStart));
        setInputEnd(toDatetimeLocalValue(data.dateEnd));
        onUpdate?.(data.dateStart, data.dateEnd);
      } else {
        setRestoreState("error");
        setRestoreMsg(data.error || dt.restoreError);
      }
    } catch {
      setRestoreState("error");
      setRestoreMsg(dt.restoreError);
    }
  }

  const isDirty =
    toDatetimeLocalValue(savedStart) !== inputStart ||
    toDatetimeLocalValue(savedEnd) !== inputEnd;

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Calendar size={13} className="text-f1-blue shrink-0" />
        <span className="text-xs font-semibold text-f1-white">{dt.title}</span>
        <span className="ml-auto text-[10px] text-muted">{dt.yourTimezone}</span>
      </div>

      {/* Countdown / status badge */}
      {eventStatus === "upcoming" && (
        <div className="flex items-center gap-2 rounded-lg bg-f1-blue/5 px-3 py-2">
          <Clock size={12} className="text-f1-blue shrink-0" />
          <span className="text-[10px] text-muted">{dt.countdownTitle}:</span>
          <span className="text-xs font-bold tabular-nums text-f1-white">
            {String(timeLeft.days).padStart(2, "0")}d{" "}
            {String(timeLeft.hours).padStart(2, "0")}h{" "}
            {String(timeLeft.minutes).padStart(2, "0")}m{" "}
            {String(timeLeft.seconds).padStart(2, "0")}s
          </span>
        </div>
      )}
      {eventStatus === "live" && (
        <div className="rounded-lg bg-f1-green/10 px-3 py-2 text-[10px] font-semibold text-f1-green animate-pulse">
          {dt.liveNow}
        </div>
      )}
      {eventStatus === "completed" && (
        <div className="rounded-lg bg-muted/10 px-3 py-2 text-[10px] text-muted">
          {dt.completed}
        </div>
      )}

      {/* Datetime inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Start */}
        <div className="space-y-1">
          <label className="block text-[10px] uppercase tracking-wider text-muted">
            {dt.startLabel}
          </label>
          <input
            type="datetime-local"
            value={inputStart}
            onChange={(e) => {
              setInputStart(e.target.value);
              setSaveState("idle");
              setSaveMsg("");
            }}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-f1-white accent-f1-red focus:outline-none focus:ring-1 focus:ring-f1-red/50"
          />
          <p className="text-[10px] text-muted/70">{toReadableLocal(savedStart)}</p>
        </div>

        {/* End */}
        <div className="space-y-1">
          <label className="block text-[10px] uppercase tracking-wider text-muted">
            {dt.endLabel}
          </label>
          <input
            type="datetime-local"
            value={inputEnd}
            onChange={(e) => {
              setInputEnd(e.target.value);
              setSaveState("idle");
              setSaveMsg("");
            }}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-f1-white accent-f1-red focus:outline-none focus:ring-1 focus:ring-f1-red/50"
          />
          <p className="text-[10px] text-muted/70">{toReadableLocal(savedEnd)}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saveState === "loading" || !isDirty}
          className="flex items-center gap-1.5 rounded-lg bg-f1-blue/15 px-3 py-2 text-xs font-medium text-f1-blue transition-colors hover:bg-f1-blue/25 disabled:opacity-50"
        >
          {saveState === "loading" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          {saveState === "loading" ? dt.saving : dt.save}
        </button>

        {/* Restore from OpenF1 */}
        <button
          onClick={handleRestoreFromOpenF1}
          disabled={restoreState === "loading"}
          className="flex items-center gap-1.5 rounded-lg bg-muted/10 px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-muted/20 hover:text-f1-white disabled:opacity-50"
        >
          {restoreState === "loading" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Download size={13} />
          )}
          {restoreState === "loading" ? dt.restoring : dt.restoreOpenF1}
        </button>
      </div>

      {/* Save feedback */}
      {saveMsg && (
        <div
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${
            saveState === "success"
              ? "bg-f1-green/10 text-f1-green"
              : "bg-f1-red/10 text-f1-red"
          }`}
        >
          {saveState === "success" ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          {saveMsg}
        </div>
      )}

      {/* Restore feedback */}
      {restoreMsg && (
        <div
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${
            restoreState === "success"
              ? "bg-f1-green/10 text-f1-green"
              : "bg-f1-red/10 text-f1-red"
          }`}
        >
          {restoreState === "success" ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          {restoreMsg}
        </div>
      )}
    </div>
  );
}
