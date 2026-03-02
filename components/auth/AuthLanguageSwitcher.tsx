"use client";

import { useLanguage, type Language } from "@/components/providers/LanguageProvider";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

export function AuthLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-card p-0.5">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            language === code
              ? "bg-f1-red text-white"
              : "text-muted hover:text-f1-white"
          }`}
          aria-pressed={language === code}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
