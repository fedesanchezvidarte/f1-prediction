"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { ChevronDown, X } from "lucide-react";
import type { Driver } from "@f1/shared/types";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { MatchStatus } from "@f1/shared/lib/prediction-status";

export type { MatchStatus };

interface DriverSelectProps {
  label: string;
  value: Driver | null;
  drivers: Driver[];
  disabledDrivers: Driver[];
  onChange: (driver: Driver | null) => void;
  disabled?: boolean;
  position?: number;
  matchStatus?: MatchStatus;
  /** Points earned by this field once scored. When > 0, renders a `+N` badge. */
  pointsAwarded?: number | null;
}

export function DriverSelect({
  label,
  value,
  drivers,
  disabledDrivers,
  onChange,
  disabled = false,
  position,
  matchStatus = null,
  pointsAwarded = null,
}: DriverSelectProps) {
  const { t } = useLanguage();
  const uid = useId();
  const labelId = `driver-select-label-${uid}`;
  const valueId = `driver-select-value-${uid}`;
  const panelId = `driver-select-panel-${uid}`;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const computeDirection = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 240;
    setOpenUpward(spaceBelow < dropdownHeight && rect.top > dropdownHeight);
  }, []);

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.firstName.toLowerCase().includes(q) ||
      d.lastName.toLowerCase().includes(q) ||
      d.nameAcronym.toLowerCase().includes(q) ||
      d.teamName.toLowerCase().includes(q)
    );
  });

  /** Benched for this race weekend — see `applyLineupOverrides`. */
  const isBenched = (driver: Driver) => driver.isUnavailable === true;

  // A benched driver is unselectable in every picker without the call site
  // having to add them to `disabledDrivers`.
  const isDisabled = (driver: Driver) =>
    isBenched(driver) ||
    disabledDrivers.some((dd) => dd.driverNumber === driver.driverNumber);

  const showPoints = pointsAwarded !== null && pointsAwarded > 0;

  const closeAndReset = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      // Escape closes the picker and hands focus back to the trigger, so a
      // keyboard user is never stranded inside the popup.
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          closeAndReset();
          buttonRef.current?.focus();
        }
      }}
    >
      {/* Not a <label>: the trigger below is a button, which cannot be
          labelled by a <label> element, so it is wired up via aria-labelledby. */}
      <div className="mb-1 flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <span id={labelId} className="flex items-center">
          {position !== undefined && (
            <span className="mr-1 text-[10px] tabular-nums text-muted/60">
              P{position}
            </span>
          )}
          {label}
        </span>
        {showPoints && (
          <span
            className="inline-flex items-center rounded-full bg-f1-green/15 px-1.5 py-0.5 text-[9px] font-bold leading-none text-f1-green normal-case tracking-normal tabular-nums"
            aria-label={`+${pointsAwarded} points earned`}
          >
            +{pointsAwarded}
          </span>
        )}
      </div>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        // Name = position label + current value, e.g. "P1 Winner, VER Max
        // Verstappen". Pointing at the value span rather than the button keeps
        // the chevron and the clear control out of the accessible name.
        aria-labelledby={`${labelId} ${valueId}`}
        aria-expanded={open}
        aria-controls={open && !disabled ? panelId : undefined}
        onClick={() => {
          if (!open) {
            computeDirection();
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          } else {
            closeAndReset();
          }
        }}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors ${
          disabled
            ? matchStatus === "exact"
              ? "cursor-not-allowed border-f1-green/60 bg-f1-green/5 text-muted/50"
              : matchStatus === "close"
                ? "cursor-not-allowed border-f1-amber/60 bg-f1-amber/5 text-muted/50"
                : "cursor-not-allowed border-border bg-card/50 text-muted/50"
            : open
              ? "border-border-hover bg-input-bg text-f1-white"
              : "border-border bg-input-bg text-foreground hover:border-border-hover"
        }`}
      >
        {value ? (
          <span id={valueId} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `#${value.teamColor}` }}
            />
            <span className="font-medium">{value.nameAcronym}</span>
            <span className="text-muted">
              {value.firstName} {value.lastName}
            </span>
          </span>
        ) : (
          <span id={valueId} className="text-muted">
            {t.predictionsPage.selectDriverPlaceholder}
          </span>
        )}
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label={t.predictionsPage.clearSelection}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="rounded p-0.5 text-muted hover:text-f1-white"
            >
              <X size={12} aria-hidden="true" />
            </span>
          )}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && !disabled && (
        <div
          id={panelId}
          className={`absolute left-0 z-40 w-full rounded-lg border border-border bg-card shadow-xl ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t.predictionsPage.searchDriverLabel}
              placeholder={t.predictionsPage.searchDriverPlaceholder}
              className="w-full rounded-md bg-input-bg px-2.5 py-1.5 text-xs text-f1-white placeholder:text-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-f1-red/60"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted" role="status">
                {t.predictionsPage.noDriversFound}
              </p>
            ) : (
              filtered.map((driver) => {
                const isSelected =
                  value?.driverNumber === driver.driverNumber;
                const benched = isBenched(driver);
                // Unselectable for EITHER reason — distinct from the driver's
                // own `isUnavailable` flag, which only means "benched".
                const unselectable = isDisabled(driver);
                const fullName = `${driver.nameAcronym} ${driver.firstName} ${driver.lastName}, ${driver.teamName}`;
                // Every unselectable reason is spelled out in the accessible
                // name, so it is never carried by colour or strikethrough alone.
                const reason = benched
                  ? t.predictionsPage.driverOutThisRaceAria
                  : unselectable
                    ? t.predictionsPage.alreadySelected
                    : null;
                return (
                  <button
                    key={driver.driverNumber}
                    type="button"
                    // aria-disabled rather than `disabled`: a disabled button is
                    // skipped by Tab, so a keyboard user would never learn the
                    // driver exists or why they cannot be picked. The click and
                    // key handlers below enforce the same unselectability.
                    aria-disabled={unselectable || undefined}
                    aria-current={isSelected ? "true" : undefined}
                    aria-label={reason ? `${fullName} — ${reason}` : undefined}
                    onClick={() => {
                      if (unselectable) return;
                      onChange(driver);
                      closeAndReset();
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-f1-red/10 text-f1-white"
                        : benched
                          ? "cursor-not-allowed bg-f1-amber/5 text-muted"
                          : unselectable
                            ? "cursor-not-allowed text-muted/60"
                            : "text-foreground hover:bg-card-hover"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: `#${driver.teamColor}`,
                        opacity: unselectable ? 0.3 : 1,
                      }}
                    />
                    <span className="shrink-0 font-medium">{driver.nameAcronym}</span>
                    <span
                      className={`min-w-0 truncate ${
                        benched ? "text-muted line-through" : "text-muted"
                      }`}
                    >
                      {driver.firstName} {driver.lastName}
                    </span>
                    {benched ? (
                      // Solid amber fill with the per-theme on-bright label:
                      // an amber-on-tint pill only reaches ~4.0:1 in light mode.
                      <span className="ml-auto inline-flex shrink-0 items-center rounded-full bg-f1-amber px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-on-bright">
                        {t.predictionsPage.driverOutThisRace}
                      </span>
                    ) : (
                      <span
                        className={`ml-auto min-w-0 truncate text-[10px] ${unselectable ? "text-muted/70" : "text-muted/50"}`}
                      >
                        {driver.teamName}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
