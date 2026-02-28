"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface AdminDriver {
  id: number;
  first_name: string;
  last_name: string;
  name_acronym: string;
  driver_number: number;
  team_id: number;
  teamName: string;
  teamColor: string;
}

interface RaceResult {
  race_id: number;
  pole_position_driver_id: number;
  top_10: number[];
  fastest_lap_driver_id: number;
  fastest_pit_stop_driver_id: number;
  driver_of_the_day_driver_id?: number | null;
}

interface SprintResult {
  race_id: number;
  sprint_pole_driver_id: number;
  top_8: number[];
  fastest_lap_driver_id: number;
}

interface ManualResultFormProps {
  raceId: number;
  sessionType: "race" | "sprint";
  drivers: AdminDriver[];
  existingResult: RaceResult | SprintResult | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ManualResultForm({
  raceId,
  sessionType,
  drivers,
  existingResult,
  onSuccess,
  onCancel,
}: ManualResultFormProps) {
  const { t } = useLanguage();
  const admin = t.admin;
  const positionCount = sessionType === "race" ? 10 : 8;

  // Initialize state from existing result or empty
  const initPositions = (): (number | null)[] => {
    if (sessionType === "race" && existingResult && "top_10" in existingResult) {
      return [...(existingResult.top_10 as number[])];
    }
    if (sessionType === "sprint" && existingResult && "top_8" in existingResult) {
      return [...(existingResult.top_8 as number[])];
    }
    return Array(positionCount).fill(null);
  };

  const initPole = (): number | null => {
    if (sessionType === "race" && existingResult && "pole_position_driver_id" in existingResult) {
      return existingResult.pole_position_driver_id;
    }
    if (sessionType === "sprint" && existingResult && "sprint_pole_driver_id" in existingResult) {
      return existingResult.sprint_pole_driver_id;
    }
    return null;
  };

  const initFastestLap = (): number | null => {
    if (existingResult && "fastest_lap_driver_id" in existingResult) {
      return existingResult.fastest_lap_driver_id;
    }
    return null;
  };

  const initFastestPit = (): number | null => {
    if (sessionType === "race" && existingResult && "fastest_pit_stop_driver_id" in existingResult) {
      return existingResult.fastest_pit_stop_driver_id;
    }
    return null;
  };

  const initDriverOfTheDay = (): number | null => {
    if (sessionType === "race" && existingResult && "driver_of_the_day_driver_id" in existingResult) {
      return (existingResult as RaceResult).driver_of_the_day_driver_id ?? null;
    }
    return null;
  };

  const [positions, setPositions] = useState<(number | null)[]>(initPositions);
  const [pole, setPole] = useState<number | null>(initPole);
  const [fastestLap, setFastestLap] = useState<number | null>(initFastestLap);
  const [fastestPit, setFastestPit] = useState<number | null>(initFastestPit);
  const [driverOfTheDay, setDriverOfTheDay] = useState<number | null>(initDriverOfTheDay);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = new Set(positions.filter((id): id is number => id !== null));

  function handlePositionChange(index: number, value: string) {
    const driverId = value ? Number(value) : null;
    setPositions((prev) => {
      const next = [...prev];
      next[index] = driverId;
      return next;
    });
  }

  function isFormValid(): boolean {
    const nonNull = positions.filter((id) => id !== null);
    if (nonNull.length !== positionCount) return false;
    if (pole === null) return false;
    if (fastestLap === null) return false;
    if (sessionType === "race" && fastestPit === null) return false;
    // Check for duplicate driver IDs in positions
    const uniqueIds = new Set(nonNull);
    if (uniqueIds.size !== positionCount) return false;
    return true;
  }

  async function handleSubmit() {
    if (!isFormValid()) return;
    setSaving(true);
    setError(null);

    try {
      const bodyData =
        sessionType === "race"
          ? {
              raceId,
              sessionType: "race",
              polePositionDriverId: pole,
              top10: positions,
              fastestLapDriverId: fastestLap,
              fastestPitStopDriverId: fastestPit,
              driverOfTheDayDriverId: driverOfTheDay,
            }
          : {
              raceId,
              sessionType: "sprint",
              sprintPoleDriverId: pole,
              top8: positions,
              fastestLapDriverId: fastestLap,
            };

      const res = await fetch("/api/results/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
      } else {
        setError(data.error || admin.saveError);
      }
    } catch {
      setError(admin.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-f1-amber/20 bg-f1-amber/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-f1-white">
          {existingResult ? admin.overrideResult : admin.manualEntry}
          <span className="ml-2 text-xs font-normal text-muted">
            ({sessionType === "race" ? admin.race : admin.sprint})
          </span>
        </h3>
        <button
          onClick={onCancel}
          className="rounded-lg p-1 text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* Pole Position */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {sessionType === "race" ? admin.pole : admin.sprintPole}
        </label>
        <select
          value={pole ?? ""}
          onChange={(e) => setPole(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber"
        >
          <option value="">{admin.selectDriver}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
            </option>
          ))}
        </select>
      </div>

      {/* Top N positions */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {sessionType === "race" ? admin.top10 : admin.top8}
        </label>
        <div className="space-y-1.5">
          {positions.map((driverId, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-muted bg-card">
                P{i + 1}
              </span>
              <select
                value={driverId ?? ""}
                onChange={(e) => handlePositionChange(i, e.target.value)}
                className="flex-1 rounded-lg border border-border bg-input-bg px-3 py-1.5 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber"
              >
                <option value="">{admin.selectDriver}</option>
                {drivers.map((d) => {
                  const isSelected = selectedIds.has(d.id) && d.id !== driverId;
                  return (
                    <option
                      key={d.id}
                      value={d.id}
                      disabled={isSelected}
                    >
                      {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
                      {isSelected ? " ✓" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Fastest Lap */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {admin.fastestLap}
        </label>
        <select
          value={fastestLap ?? ""}
          onChange={(e) => setFastestLap(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber"
        >
          <option value="">{admin.selectDriver}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
            </option>
          ))}
        </select>
      </div>

      {/* Fastest Pit Stop (race only) */}
      {sessionType === "race" && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">
            {admin.fastestPit}
          </label>
          <select
            value={fastestPit ?? ""}
            onChange={(e) => setFastestPit(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber"
          >
            <option value="">{admin.selectDriver}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Driver of the Day (race only) */}
      {sessionType === "race" && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">
            {admin.driverOfTheDay}
          </label>
          <select
            value={driverOfTheDay ?? ""}
            onChange={(e) => setDriverOfTheDay(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber"
          >
            <option value="">{admin.selectDriver}</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-f1-red/10 px-3 py-2 text-xs text-f1-red">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-border px-4 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-hover hover:text-f1-white disabled:opacity-50"
        >
          {admin.cancel}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isFormValid() || saving}
          className="flex items-center gap-1.5 rounded-lg bg-f1-red px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-f1-red-hover disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Save size={12} />
          )}
          {saving ? admin.saving : admin.saveResult}
        </button>
      </div>
    </div>
  );
}
