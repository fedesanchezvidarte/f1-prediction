"use client";

import { createContext, useContext, useState } from "react";
import type { Messages } from "@/messages/en";
import en from "@/messages/en";
import es from "@/messages/es";

export type Language = "en" | "es";

const MESSAGES: Record<Language, Messages> = { en, es };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Messages;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: en,
});

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem("language");
    if (stored === "en" || stored === "es") return stored;
  } catch {
    // localStorage unavailable (SSR guard)
  }
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    document.documentElement.lang = lang;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: MESSAGES[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
