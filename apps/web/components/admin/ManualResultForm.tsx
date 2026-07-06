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
  qualifying_top_3?: number[] | null;
  qualifying_p4_driver_id?: number | null;
  top_10: number[];
  p11_driver_id?: number | null;
  fastest_lap_driver_id: number;
  fastest_pit_stop_driver_id: number;
  driver_of_the_day_driver_id?: number | null;
  dnf_driver_ids?: number[] | null;
}

interface SprintResult {
  race_id: number;
  sprint_pole_driver_id: number;
  qualifying_top_3?: number[] | null;
  qualifying_p4_driver_id?: number | null;
  top_8: number[];
  p9_driver_id?: number | null;
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

  // Qualifying top-3 [Q1, Q2, Q3]. Falls back to the legacy single pole column
  // (Q1) for existing results saved before the new points system.
  const initQualifyingTop3 = (): (number | null)[] => {
    if (existingResult) {
      const stored = (existingResult as RaceResult | SprintResult).qualifying_top_3;
      if (stored && stored.length > 0) {
        return [stored[0] ?? null, stored[1] ?? null, stored[2] ?? null];
      }
      const legacyPole =
        sessionType === "race" && "pole_position_driver_id" in existingResult
          ? existingResult.pole_position_driver_id
          : sessionType === "sprint" && "sprint_pole_driver_id" in existingResult
            ? existingResult.sprint_pole_driver_id
            : null;
      if (legacyPole != null) return [legacyPole, null, null];
    }
    return [null, null, null];
  };

  const initQualifyingP4 = (): number | null => {
    if (existingResult && "qualifying_p4_driver_id" in existingResult) {
      return (existingResult as RaceResult | SprintResult).qualifying_p4_driver_id ?? null;
    }
    return null;
  };

  const initBoundary = (): number | null => {
    if (sessionType === "race" && existingResult && "p11_driver_id" in existingResult) {
      return (existingResult as RaceResult).p11_driver_id ?? null;
    }
    if (sessionType === "sprint" && existingResult && "p9_driver_id" in existingResult) {
      return (existingResult as SprintResult).p9_driver_id ?? null;
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

  const initDnfs = (): number[] => {
    if (sessionType === "race" && existingResult && "dnf_driver_ids" in existingResult) {
      const ids = (existingResult as RaceResult).dnf_driver_ids ?? [];
      return [...new Set(ids)];
    }
    return [];
  };

  const [positions, setPositions] = useState<(number | null)[]>(initPositions);
  const [qualifyingTop3, setQualifyingTop3] = useState<(number | null)[]>(initQualifyingTop3);
  const [qualifyingP4, setQualifyingP4] = useState<number | null>(initQualifyingP4);
  const [boundary, setBoundary] = useState<number | null>(initBoundary);
  const [fastestLap, setFastestLap] = useState<number | null>(initFastestLap);
  const [fastestPit, setFastestPit] = useState<number | null>(initFastestPit);
  const [driverOfTheDay, setDriverOfTheDay] = useState<number | null>(initDriverOfTheDay);
  const [dnfDriverIds, setDnfDriverIds] = useState<number[]>(initDnfs);
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
    // All three qualifying slots are required and must be distinct.
    const qualiNonNull = qualifyingTop3.filter((id): id is number => id !== null);
    if (qualiNonNull.length !== 3) return false;
    if (new Set(qualiNonNull).size !== 3) return false;
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
              qualifyingTop3,
              qualifyingP4DriverId: qualifyingP4,
              top10: positions,
              p11DriverId: boundary,
              fastestLapDriverId: fastestLap,
              fastestPitStopDriverId: fastestPit,
              driverOfTheDayDriverId: driverOfTheDay,
              dnfDriverIds: dnfDriverIds.length > 0 ? dnfDriverIds : null,
            }
          : {
              raceId,
              sessionType: "sprint",
              qualifyingTop3,
              qualifyingP4DriverId: qualifyingP4,
              top8: positions,
              p9DriverId: boundary,
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

      {/* Qualifying Top 3 (Q1–Q3) + Q4 boundary */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {admin.qualifyingTop3}
        </label>
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => {
            const qualiSelected = new Set(
              qualifyingTop3.filter((id): id is number => id !== null)
            );
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-muted bg-card">
                  Q{i + 1}
                </span>
                <select
                  value={qualifyingTop3[i] ?? ""}
                  onChange={(e) => {
                    const driverId = e.target.value ? Number(e.target.value) : null;
                    setQualifyingTop3((prev) => {
                      const next = [...prev];
                      next[i] = driverId;
                      return next;
                    });
                  }}
                  className="flex-1 rounded-lg border border-border bg-input-bg px-3 py-1.5 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber"
                >
                  <option value="">{admin.selectDriver}</option>
                  {drivers.map((d) => {
                    const isDup = qualiSelected.has(d.id) && d.id !== qualifyingTop3[i];
                    return (
                      <option key={d.id} value={d.id} disabled={isDup}>
                        {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
                        {isDup ? " ✓" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })}
          {/* Q4 — boundary slot for ±1 proximity scoring on the Q3 prediction. */}
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-muted bg-card">
              Q4
            </span>
            <select
              value={qualifyingP4 ?? ""}
              onChange={(e) => setQualifyingP4(e.target.value ? Number(e.target.value) : null)}
              className="flex-1 rounded-lg border border-border bg-input-bg px-3 py-1.5 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber"
            >
              <option value="">{admin.selectDriverOptional}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
                </option>
              ))}
            </select>
          </div>
        </div>
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

      {/* Boundary slot (P11 for race, P9 for sprint) — enables ±1 proximity scoring. */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {sessionType === "race" ? admin.p11 : admin.p9}
        </label>
        <select
          value={boundary ?? ""}
          onChange={(e) => setBoundary(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber"
        >
          <option value="">{admin.selectDriverOptional}</option>
          {drivers.map((d) => {
            const isInTopN = selectedIds.has(d.id);
            return (
              <option key={d.id} value={d.id} disabled={isInTopN}>
                {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
                {isInTopN ? " ✓" : ""}
              </option>
            );
          })}
        </select>
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

      {/* DNFs (race only) */}
      {sessionType === "race" && (
        <div>
          <label className="mb-1 block text-[11px] font-medium text-muted">
            {admin.driverStatsDnfs ?? "DNFs"} ({admin.driverStatsDnfsOptional ?? "optional"})
          </label>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-input-bg p-2 space-y-1">
            {drivers.map((d) => (
              <label
                key={d.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-xs text-f1-white transition-colors hover:bg-card-hover cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={dnfDriverIds.includes(d.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setDnfDriverIds((prev) => [...prev, d.id]);
                    } else {
                      setDnfDriverIds((prev) => prev.filter((id) => id !== d.id));
                    }
                  }}
                  className="rounded border-border accent-f1-red"
                />
                {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
              </label>
            ))}
          </div>
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
