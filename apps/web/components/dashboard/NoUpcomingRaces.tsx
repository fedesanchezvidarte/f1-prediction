"use client";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function NoUpcomingRaces() {
  const { t } = useLanguage();
  return (
    <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
      {t.nextRace.noUpcoming}
    </div>
  );
}
