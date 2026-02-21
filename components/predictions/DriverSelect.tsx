"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, X } from "lucide-react";
import type { Driver } from "@/types";

export type MatchStatus = "exact" | "close" | "miss" | null;

interface DriverSelectProps {
  label: string;
  value: Driver | null;
  drivers: Driver[];
  disabledDrivers: Driver[];
  onChange: (driver: Driver | null) => void;
  disabled?: boolean;
  position?: number;
  matchStatus?: MatchStatus;
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
}: DriverSelectProps) {
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

  const isDisabled = (driver: Driver) =>
    disabledDrivers.some((dd) => dd.driverNumber === driver.driverNumber);

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted">
        {position !== undefined && (
          <span className="mr-1 text-[10px] tabular-nums text-muted/60">
            P{position}
          </span>
        )}
        {label}
      </label>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!open) {
            computeDirection();
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          } else {
            setOpen(false);
            setSearch("");
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
          <span className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `#${value.teamColor}` }}
            />
            <span className="font-medium">{value.nameAcronym}</span>
            <span className="text-muted">
              {value.firstName} {value.lastName}
            </span>
          </span>
        ) : (
          <span className="text-muted">Select driver...</span>
        )}
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="rounded p-0.5 text-muted hover:text-f1-white"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && !disabled && (
        <div
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
              placeholder="Search driver..."
              className="w-full rounded-md bg-input-bg px-2.5 py-1.5 text-xs text-f1-white placeholder:text-muted/50 focus:outline-none"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No drivers found</p>
            ) : (
              filtered.map((driver) => {
                const isSelected =
                  value?.driverNumber === driver.driverNumber;
                const isUnavailable = isDisabled(driver);
                return (
                  <button
                    key={driver.driverNumber}
                    type="button"
                    disabled={isUnavailable}
                    onClick={() => {
                      onChange(driver);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-f1-red/10 text-f1-white"
                        : isUnavailable
                          ? "cursor-not-allowed text-muted/30"
                          : "text-foreground hover:bg-card-hover"
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: `#${driver.teamColor}`,
                        opacity: isUnavailable ? 0.3 : 1,
                      }}
                    />
                    <span className="font-medium">{driver.nameAcronym}</span>
                    <span className={isUnavailable ? "text-muted/30" : "text-muted"}>
                      {driver.firstName} {driver.lastName}
                    </span>
                    <span
                      className={`ml-auto text-[10px] ${isUnavailable ? "text-muted/20" : "text-muted/50"}`}
                    >
                      {driver.teamName}
                    </span>
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
