"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { LineupRosterEntry } from "@f1/shared/types";

interface LineupRace {
  id: number;
  round: number;
  raceName: string;
}

interface LineupTeam {
  id: number;
  name: string;
  color: string;
}

interface LineupManagerProps {
  /** Races of the current season, ordered by round. */
  races: LineupRace[];
  /** Teams of the current season — the options for the per-race team override. */
  teams: LineupTeam[];
}

type RowState = "idle" | "loading" | "success" | "error";

/** The editable shape of one roster row. */
interface RowDraft {
  isUnavailable: boolean;
  teamId: number | null;
  note: string;
}

/** What the row looks like as currently stored, i.e. the "not dirty" state. */
function baselineOf(entry: LineupRosterEntry): RowDraft {
  return {
    isUnavailable: entry.override?.isUnavailable ?? false,
    teamId: entry.override?.teamId ?? null,
    note: entry.override?.note ?? "",
  };
}

function isSameDraft(a: RowDraft, b: RowDraft): boolean {
  return (
    a.isUnavailable === b.isUnavailable &&
    a.teamId === b.teamId &&
    a.note.trim() === b.note.trim()
  );
}

/** Team colors are stored without the leading `#`. */
function toHex(color: string | undefined): string {
  if (!color) return "#666666";
  return color.startsWith("#") ? color : `#${color}`;
}

const selectClass =
  "w-full rounded-lg border border-border bg-input-bg px-3 py-2 text-xs text-f1-white outline-none transition-colors focus:border-f1-red focus-visible:ring-2 focus-visible:ring-f1-red/50";

const checkboxClass =
  "h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-f1-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-f1-red/60 disabled:cursor-not-allowed disabled:opacity-50";

export function LineupManager({ races, teams }: LineupManagerProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const admin = t.admin;

  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(
    races[0]?.id ?? null
  );
  const [roster, setRoster] = useState<LineupRosterEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  // The first fetch is kicked off by the effect below on mount, so the roster
  // starts out loading. Every later trigger re-arms this in its own handler,
  // which keeps setState out of the effect body.
  const [rosterState, setRosterState] = useState<"idle" | "loading" | "error">("loading");
  const [rowState, setRowState] = useState<Record<number, RowState>>({});
  const [rowMessage, setRowMessage] = useState<Record<number, string>>({});
  // Bumped after every successful write so the roster is re-read from the API.
  const [reloadToken, setReloadToken] = useState(0);

  // Load the roster for the selected race. Row feedback is cleared by the race
  // selector rather than here, so a "saved" message survives the reload.
  useEffect(() => {
    if (selectedRaceId === null) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/admin/lineup?raceId=${selectedRaceId}`);
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && Array.isArray(data.roster)) {
          const entries = data.roster as LineupRosterEntry[];
          setRoster(entries);
          setDrafts(
            Object.fromEntries(entries.map((e) => [e.driverId, baselineOf(e)]))
          );
          setRosterState("idle");
        } else {
          setRosterState("error");
        }
      } catch {
        if (!cancelled) setRosterState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRaceId, reloadToken]);

  function handleRaceChange(raceId: number) {
    setSelectedRaceId(raceId);
    setRosterState("loading");
    setRoster([]);
    setDrafts({});
    setRowState({});
    setRowMessage({});
  }

  function patchDraft(driverId: number, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [driverId]: { ...prev[driverId], ...patch },
    }));
    // Editing invalidates the previous save feedback for that row.
    setRowState((prev) => ({ ...prev, [driverId]: "idle" }));
    setRowMessage((prev) => ({ ...prev, [driverId]: "" }));
  }

  function markSuccess(driverId: number) {
    setRowState((prev) => ({ ...prev, [driverId]: "success" }));
    setRowMessage((prev) => ({ ...prev, [driverId]: admin.lineupSaved }));
    setRosterState("loading");
    setReloadToken((n) => n + 1);
    router.refresh();
  }

  function markError(driverId: number, message?: string) {
    setRowState((prev) => ({ ...prev, [driverId]: "error" }));
    setRowMessage((prev) => ({ ...prev, [driverId]: message || admin.lineupError }));
  }

  /** Season-wide availability — leaves every race this season. */
  async function handleToggleActive(driverId: number, isActive: boolean) {
    setRowState((prev) => ({ ...prev, [driverId]: "loading" }));
    setRowMessage((prev) => ({ ...prev, [driverId]: "" }));

    try {
      const res = await fetch("/api/admin/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, isActive }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        markSuccess(driverId);
      } else {
        markError(driverId, data.error);
      }
    } catch {
      markError(driverId);
    }
  }

  /** Upsert this row's per-race override. */
  async function handleSave(driverId: number) {
    if (selectedRaceId === null) return;
    const draft = drafts[driverId];
    if (!draft) return;

    setRowState((prev) => ({ ...prev, [driverId]: "loading" }));
    setRowMessage((prev) => ({ ...prev, [driverId]: "" }));

    try {
      const res = await fetch("/api/admin/lineup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceId: selectedRaceId,
          driverId,
          isUnavailable: draft.isUnavailable,
          teamId: draft.teamId,
          note: draft.note.trim() ? draft.note.trim() : null,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        markSuccess(driverId);
      } else {
        markError(driverId, data.error);
      }
    } catch {
      markError(driverId);
    }
  }

  /** Drop this row's override entirely. */
  async function handleClear(driverId: number) {
    if (selectedRaceId === null) return;

    setRowState((prev) => ({ ...prev, [driverId]: "loading" }));
    setRowMessage((prev) => ({ ...prev, [driverId]: "" }));

    try {
      const res = await fetch("/api/admin/lineup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raceId: selectedRaceId, driverId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        markSuccess(driverId);
      } else {
        markError(driverId, data.error);
      }
    } catch {
      markError(driverId);
    }
  }

  if (races.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Race selector */}
      <div className="max-w-sm">
        <label
          htmlFor="lineup-race"
          className="mb-1 block text-[11px] font-medium text-muted"
        >
          {admin.lineupSelectRace}
        </label>
        <select
          id="lineup-race"
          value={selectedRaceId ?? ""}
          onChange={(e) => handleRaceChange(Number(e.target.value))}
          className={selectClass}
        >
          {races.map((race) => (
            <option key={race.id} value={race.id}>
              R{race.round} — {race.raceName}
            </option>
          ))}
        </select>
      </div>

      {/* Roster loading / failure. As with the row feedback, the live region is
          always mounted; the visible boxes below are plain, non-live markup. */}
      <span role="status" className="sr-only">
        {rosterState === "loading"
          ? t.loading.redirecting
          : rosterState === "error"
            ? admin.lineupError
            : ""}
      </span>
      {rosterState === "loading" && (
        <div className="flex items-center gap-2 rounded-lg bg-card-hover px-3 py-2 text-xs text-muted">
          <Loader2 size={13} className="animate-spin" aria-hidden="true" />
          {t.loading.redirecting}
        </div>
      )}
      {rosterState === "error" && (
        <div className="flex items-center gap-1.5 rounded-lg bg-f1-red/10 px-3 py-2 text-xs text-f1-red">
          <AlertCircle size={13} aria-hidden="true" />
          {admin.lineupError}
        </div>
      )}

      {/* Roster rows */}
      <ul aria-busy={rosterState === "loading" || undefined} className="space-y-2">
        {roster.map((entry) => {
          const draft = drafts[entry.driverId] ?? baselineOf(entry);
          const baseline = baselineOf(entry);
          const state = rowState[entry.driverId] ?? "idle";
          const message = rowMessage[entry.driverId] ?? "";
          const busy = state === "loading";
          const isDirty = !isSameDraft(draft, baseline);
          const seasonTeam = teams.find((team) => team.id === entry.seasonTeamId);
          const nameId = `lineup-name-${entry.driverId}`;
          const activeId = `lineup-active-${entry.driverId}`;
          const activeLabelId = `lineup-active-label-${entry.driverId}`;
          const activeHintId = `lineup-active-hint-${entry.driverId}`;
          const outId = `lineup-out-${entry.driverId}`;
          const outLabelId = `lineup-out-label-${entry.driverId}`;
          const teamId = `lineup-team-${entry.driverId}`;
          const teamLabelId = `lineup-team-label-${entry.driverId}`;
          const teamHintId = `lineup-team-hint-${entry.driverId}`;
          const noteId = `lineup-note-${entry.driverId}`;
          const noteLabelId = `lineup-note-label-${entry.driverId}`;
          const saveLabelId = `lineup-save-label-${entry.driverId}`;
          const clearLabelId = `lineup-clear-label-${entry.driverId}`;

          return (
            <li
              key={entry.driverId}
              // Every row repeats the same four labels, so the row is a named
              // group and each control's accessible name is prefixed with the
              // driver — form-field navigation ignores group boundaries.
              role="group"
              aria-labelledby={nameId}
              aria-busy={busy || undefined}
              className="rounded-lg border border-border bg-background/40 p-3 space-y-3"
            >
              {/* Identity + season availability */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="h-7 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: toHex(seasonTeam?.color) }}
                  />
                  <div className="min-w-0">
                    <p
                      id={nameId}
                      className={`truncate text-sm font-semibold ${
                        entry.isActive ? "text-f1-white" : "text-muted line-through"
                      }`}
                    >
                      {entry.nameAcronym} #{entry.driverNumber} —{" "}
                      {entry.firstName} {entry.lastName}
                    </p>
                    <p className="truncate text-[10px] text-muted">
                      {admin.lineupSeasonTeam}: {entry.seasonTeamName}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 sm:max-w-[15rem]">
                  <div className="flex items-center gap-2">
                    <input
                      id={activeId}
                      type="checkbox"
                      checked={entry.isActive}
                      disabled={busy}
                      aria-labelledby={`${nameId} ${activeLabelId}`}
                      aria-describedby={activeHintId}
                      onChange={(e) =>
                        handleToggleActive(entry.driverId, e.target.checked)
                      }
                      className={checkboxClass}
                    />
                    <label
                      id={activeLabelId}
                      htmlFor={activeId}
                      className="cursor-pointer text-xs font-medium text-f1-white"
                    >
                      {admin.lineupActive}
                    </label>
                  </div>
                  <p id={activeHintId} className="mt-0.5 text-[10px] text-muted">
                    {admin.lineupActiveHint}
                  </p>
                </div>
              </div>

              {/* Per-race override fields */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {/* Out this race */}
                <div className="flex items-center gap-2">
                  <input
                    id={outId}
                    type="checkbox"
                    checked={draft.isUnavailable}
                    disabled={busy}
                    aria-labelledby={`${nameId} ${outLabelId}`}
                    onChange={(e) =>
                      patchDraft(entry.driverId, { isUnavailable: e.target.checked })
                    }
                    className={checkboxClass}
                  />
                  <label
                    id={outLabelId}
                    htmlFor={outId}
                    className="cursor-pointer text-xs font-medium text-f1-white"
                  >
                    {admin.lineupUnavailable}
                  </label>
                </div>

                {/* Team override */}
                <div>
                  <label
                    id={teamLabelId}
                    htmlFor={teamId}
                    className="mb-1 block text-[11px] font-medium text-muted"
                  >
                    {admin.lineupTeamOverride}
                  </label>
                  <select
                    id={teamId}
                    value={draft.teamId ?? ""}
                    disabled={busy}
                    aria-labelledby={`${nameId} ${teamLabelId}`}
                    aria-describedby={teamHintId}
                    onChange={(e) =>
                      patchDraft(entry.driverId, {
                        teamId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className={`${selectClass} disabled:opacity-50`}
                  >
                    <option value="">{admin.lineupNoOverride}</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <p
                    id={teamHintId}
                    className="mt-1 flex items-start gap-1 text-[10px] text-muted"
                  >
                    <Info size={11} className="mt-px shrink-0" aria-hidden="true" />
                    {admin.lineupWccHint}
                  </p>
                </div>

                {/* Note */}
                <div className="md:col-span-2">
                  <label
                    id={noteLabelId}
                    htmlFor={noteId}
                    className="mb-1 block text-[11px] font-medium text-muted"
                  >
                    {admin.lineupNote}
                  </label>
                  <input
                    id={noteId}
                    type="text"
                    value={draft.note}
                    disabled={busy}
                    aria-labelledby={`${nameId} ${noteLabelId}`}
                    placeholder={admin.lineupNotePlaceholder}
                    onChange={(e) =>
                      patchDraft(entry.driverId, { note: e.target.value })
                    }
                    className={`${selectClass} placeholder:text-muted/70 disabled:opacity-50`}
                  />
                </div>
              </div>

              {/* Row actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(entry.driverId)}
                  disabled={busy || !isDirty}
                  // 20 rows means 20 identical "Save" buttons; naming each one
                  // after its driver keeps them distinguishable out of context.
                  aria-labelledby={`${nameId} ${saveLabelId}`}
                  className="flex items-center gap-1.5 rounded-lg bg-f1-blue/15 px-3 py-2 text-xs font-medium text-f1-blue transition-colors hover:bg-f1-blue/25 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Save size={13} aria-hidden="true" />
                  )}
                  <span id={saveLabelId}>
                    {busy ? admin.lineupSaving : admin.lineupSave}
                  </span>
                </button>

                {entry.override && (
                  <button
                    type="button"
                    onClick={() => handleClear(entry.driverId)}
                    disabled={busy}
                    aria-labelledby={`${nameId} ${clearLabelId}`}
                    className="flex items-center gap-1.5 rounded-lg bg-f1-red/15 px-3 py-2 text-xs font-medium text-f1-red transition-colors hover:bg-f1-red/25 disabled:opacity-50"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    <span id={clearLabelId}>{admin.lineupClear}</span>
                  </button>
                )}
              </div>

              {/* Row feedback. The live region is mounted for the row's whole
                  lifetime — a region inserted at the same moment as its text is
                  not reliably announced. It is absolutely positioned (sr-only),
                  so it adds nothing to the layout. The visible box below is
                  deliberately NOT a live region, to avoid a double read. */}
              <span role="status" className="sr-only">
                {busy ? admin.lineupSaving : message}
              </span>
              {message && (
                <div
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ${
                    state === "success"
                      ? "bg-f1-green/10 text-f1-green"
                      : "bg-f1-red/10 text-f1-red"
                  }`}
                >
                  {state === "success" ? (
                    <CheckCircle2 size={12} aria-hidden="true" />
                  ) : (
                    <AlertCircle size={12} aria-hidden="true" />
                  )}
                  {message}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
