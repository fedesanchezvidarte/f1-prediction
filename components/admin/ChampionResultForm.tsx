"use client";

import { useState, useMemo } from "react";
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

interface AdminTeam {
  id: number;
  name: string;
  color: string;
}

interface ChampionResult {
  wdc_driver_id: number;
  wcc_team_id: number;
  most_dnfs_driver_id: number | null;
  most_podiums_driver_id: number | null;
  most_wins_driver_id: number | null;
}

interface TeamBestDriverResult {
  teamId: number;
  driverId: number;
}

interface ChampionResultFormProps {
  drivers: AdminDriver[];
  teams: AdminTeam[];
  existingResult: ChampionResult | null;
  existingTeamBestDriverResults: TeamBestDriverResult[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ChampionResultForm({
  drivers,
  teams,
  existingResult,
  existingTeamBestDriverResults,
  onSuccess,
  onCancel,
}: ChampionResultFormProps) {
  const { t } = useLanguage();
  const admin = t.admin;

  const [wdcDriverId, setWdcDriverId] = useState<number | null>(
    existingResult?.wdc_driver_id ?? null
  );
  const [wccTeamId, setWccTeamId] = useState<number | null>(
    existingResult?.wcc_team_id ?? null
  );
  const [mostDnfsDriverId, setMostDnfsDriverId] = useState<number | null>(
    existingResult?.most_dnfs_driver_id ?? null
  );
  const [mostPodiumsDriverId, setMostPodiumsDriverId] = useState<number | null>(
    existingResult?.most_podiums_driver_id ?? null
  );
  const [mostWinsDriverId, setMostWinsDriverId] = useState<number | null>(
    existingResult?.most_wins_driver_id ?? null
  );

  // Team best driver selections: { [teamId]: driverId }
  const [teamBestDrivers, setTeamBestDrivers] = useState<Record<number, number | null>>(() => {
    const init: Record<number, number | null> = {};
    for (const team of teams) {
      const existing = existingTeamBestDriverResults.find((r) => r.teamId === team.id);
      init[team.id] = existing?.driverId ?? null;
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group drivers by team for the team best driver section
  const driversByTeam = useMemo(() => {
    const map = new Map<number, AdminDriver[]>();
    for (const d of drivers) {
      const list = map.get(d.team_id) ?? [];
      list.push(d);
      map.set(d.team_id, list);
    }
    return map;
  }, [drivers]);

  function isFormValid() {
    return wdcDriverId !== null && wccTeamId !== null;
  }

  async function handleSubmit() {
    if (!isFormValid()) return;
    setSaving(true);
    setError(null);

    // Build team best drivers array
    const teamBestDriversPayload = Object.entries(teamBestDrivers)
      .filter(([, driverId]) => driverId !== null)
      .map(([teamId, driverId]) => ({
        teamId: Number(teamId),
        driverId: driverId as number,
      }));

    try {
      const res = await fetch("/api/results/champion/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wdcDriverId,
          wccTeamId,
          mostDnfsDriverId,
          mostPodiumsDriverId,
          mostWinsDriverId,
          teamBestDrivers: teamBestDriversPayload,
        }),
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

  const selectClass =
    "w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-xs text-f1-white outline-none transition-colors focus:border-f1-amber";

  return (
    <div className="rounded-lg border border-f1-amber/20 bg-f1-amber/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-f1-white">
          {existingResult ? admin.championOverrideResult : admin.championManualEntry}
        </h3>
        <button
          onClick={onCancel}
          className="rounded-lg p-1 text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* WDC Winner */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {admin.wdcWinner}
        </label>
        <select
          value={wdcDriverId ?? ""}
          onChange={(e) =>
            setWdcDriverId(e.target.value ? Number(e.target.value) : null)
          }
          className={selectClass}
        >
          <option value="">{admin.selectDriver}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
            </option>
          ))}
        </select>
      </div>

      {/* WCC Winner */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {admin.wccWinner}
        </label>
        <select
          value={wccTeamId ?? ""}
          onChange={(e) =>
            setWccTeamId(e.target.value ? Number(e.target.value) : null)
          }
          className={selectClass}
        >
          <option value="">{admin.selectTeam}</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {/* Most DNFs */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {admin.mostDnfs ?? "Most DNFs"}
        </label>
        <select
          value={mostDnfsDriverId ?? ""}
          onChange={(e) =>
            setMostDnfsDriverId(e.target.value ? Number(e.target.value) : null)
          }
          className={selectClass}
        >
          <option value="">{admin.selectDriver}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
            </option>
          ))}
        </select>
      </div>

      {/* Most Podiums */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {admin.mostPodiums ?? "Most Podiums"}
        </label>
        <select
          value={mostPodiumsDriverId ?? ""}
          onChange={(e) =>
            setMostPodiumsDriverId(e.target.value ? Number(e.target.value) : null)
          }
          className={selectClass}
        >
          <option value="">{admin.selectDriver}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
            </option>
          ))}
        </select>
      </div>

      {/* Most Wins */}
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted">
          {admin.mostWins ?? "Most Wins"}
        </label>
        <select
          value={mostWinsDriverId ?? ""}
          onChange={(e) =>
            setMostWinsDriverId(e.target.value ? Number(e.target.value) : null)
          }
          className={selectClass}
        >
          <option value="">{admin.selectDriver}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_acronym} — {d.first_name} {d.last_name} ({d.teamName})
            </option>
          ))}
        </select>
      </div>

      {/* Team Best Drivers */}
      <div>
        <label className="mb-2 block text-[11px] font-medium text-muted">
          {admin.teamBestDrivers ?? "Team Best Drivers"}
        </label>
        <div className="space-y-2">
          {teams.map((team) => {
            const teamDrivers = driversByTeam.get(team.id) ?? [];
            return (
              <div key={team.id} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-xs text-muted min-w-25 truncate">
                  {team.name}
                </span>
                <select
                  value={teamBestDrivers[team.id] ?? ""}
                  onChange={(e) =>
                    setTeamBestDrivers((prev) => ({
                      ...prev,
                      [team.id]: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className={selectClass}
                >
                  <option value="">{admin.selectDriver}</option>
                  {teamDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name_acronym} — {d.first_name} {d.last_name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

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
