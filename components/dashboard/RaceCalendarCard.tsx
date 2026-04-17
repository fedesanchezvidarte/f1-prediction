"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { RaceCalendarModal } from "./RaceCalendarModal";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { RaceCalendarEntry } from "@/lib/race-utils";

interface RaceCalendarCardProps {
  entries: RaceCalendarEntry[];
}

export function RaceCalendarCard({ entries }: RaceCalendarCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center transition-colors hover:bg-card-hover sm:p-6"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-f1-red/10">
          <CalendarDays size={20} className="text-f1-red" />
        </div>
        <div>
          <p className="text-xs font-medium text-f1-white">
            {t.raceCalendar.title}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            {t.raceCalendar.tapToView}
          </p>
        </div>
      </button>

      {isModalOpen && (
        <RaceCalendarModal
          entries={entries}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
