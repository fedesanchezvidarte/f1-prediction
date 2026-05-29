"use client";

import { useState } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { PointSystemModal } from "./PointSystemModal";
import { buildPointSystem } from "@/lib/point-system";
import { useLanguage } from "@/components/providers/LanguageProvider";

/**
 * Prominent dashboard banner announcing the new points system.
 * Solid purple-gradient bar above the bento grid; opens the (shared,
 * enhanced) PointSystemModal with worked-example tooltips.
 */
export function NewPointsSystemBanner() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useLanguage();
  const sections = buildPointSystem(t.pointSystem.sections);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        aria-haspopup="dialog"
        className="group mb-4 flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#9333EA] px-4 py-3 text-left shadow-lg shadow-[#7C3AED]/30 transition-shadow hover:shadow-xl hover:shadow-[#7C3AED]/40 sm:gap-4 sm:px-6 sm:py-4"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 sm:h-11 sm:w-11">
          <Sparkles
            size={20}
            className="text-white transition-transform group-hover:scale-110"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-white sm:text-base">
              {t.newPointsSystem.title}
            </p>
            <span className="hidden rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:inline">
              New
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] italic text-white/85 sm:text-xs">
            {t.newPointsSystem.subtitle}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#5B21B6] transition-colors group-hover:bg-white/90 sm:px-3 sm:text-xs">
          <span className="hidden sm:inline">{t.newPointsSystem.cta}</span>
          <ChevronRight size={14} />
        </span>
      </button>

      {isModalOpen && (
        <PointSystemModal
          sections={sections}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
