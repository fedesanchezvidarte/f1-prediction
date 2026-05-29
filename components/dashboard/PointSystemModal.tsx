"use client";

import { X, Info, Sparkles } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { PointSystemRule, PointSystemSection } from "@/types";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface PointSystemModalProps {
  sections: PointSystemSection[];
  onClose: () => void;
}

export function PointSystemModal({ sections, onClose }: PointSystemModalProps) {
  const { t } = useLanguage();
  const titleId = useId();

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-f1-purple/30 bg-card shadow-2xl shadow-f1-purple/10"
      >
        {/* Fancier header with a purple gradient accent */}
        <div className="sticky top-0 z-10 border-b border-border bg-gradient-to-r from-f1-purple/20 via-card to-card px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-f1-purple/15">
                <Sparkles size={18} className="text-f1-purple" />
              </div>
              <div>
                <h2 id={titleId} className="text-lg font-bold leading-tight text-f1-white">
                  {t.pointSystem.modalTitle}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  {t.pointSystem.modalSubtitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card-hover hover:text-f1-white"
              aria-label={t.pointSystem.closeModal}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-f1-white">
                  {section.title}
                </h3>
                <span className="rounded-full bg-f1-red/10 px-2.5 py-0.5 text-[10px] font-semibold text-f1-red">
                  {t.pointSystem.max} {section.maxPoints} {t.pointSystem.pts}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {section.rules.map((rule) => (
                  <RuleRow key={rule.category} rule={rule} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: PointSystemRule }) {
  const hasExample = Boolean(rule.example);

  return (
    <div
      className={`flex items-center justify-between rounded-md px-3 py-2 text-xs transition-colors hover:bg-card-hover ${
        hasExample ? "bg-f1-purple/[0.04]" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-f1-white">{rule.category}</p>
          {hasExample && <RuleExample example={rule.example!} />}
        </div>
        <p className="mt-0.5 text-[10px] text-muted">{rule.description}</p>
      </div>
      <span className="ml-4 whitespace-nowrap font-semibold tabular-nums text-f1-amber">
        +{rule.points}
      </span>
    </div>
  );
}

/**
 * Info-icon tooltip showing a worked example for proximity & bonus rules.
 * Opens on hover/focus (desktop) and on tap (mobile); dismissible with Escape.
 */
function RuleExample({ example }: { example: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={t.pointSystem.showExample}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full text-f1-purple/70 transition-colors hover:text-f1-purple focus:text-f1-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-f1-purple/50"
      >
        <Info size={13} />
      </button>
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          className="absolute left-0 top-full z-20 mt-1.5 w-56 whitespace-pre-line rounded-lg border border-f1-purple/30 bg-background p-2.5 text-left text-[11px] font-normal leading-relaxed text-f1-white shadow-xl shadow-black/40"
        >
          <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-f1-purple">
            {t.pointSystem.example}
          </span>
          {example}
        </span>
      )}
    </span>
  );
}
