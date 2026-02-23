"use client";

import { Construction } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

export function PlaceholderCard() {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-5 sm:p-6">
      <Construction size={20} className="text-muted/40" />
      <p className="text-[10px] text-muted/40">{t.placeholder.stillCooking}</p>
    </div>
  );
}
