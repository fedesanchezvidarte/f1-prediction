import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, useContext, useEffect, useState } from "react";
import type { Messages } from "@f1/shared/messages/en";
import en from "@f1/shared/messages/en";
import es from "@f1/shared/messages/es";

export type Language = "en" | "es";

const MESSAGES: Record<Language, Messages> = { en, es };
const STORAGE_KEY = "language";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Messages;
}

// Same context shape as the web LanguageProvider so consuming code reads
// identically; the backing store is expo-localization + AsyncStorage
// instead of navigator/localStorage.
const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: en,
});

function getDeviceLanguage(): Language {
  for (const locale of getLocales()) {
    if (locale.languageCode === "es") return "es";
    if (locale.languageCode === "en") return "en";
  }
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getDeviceLanguage);

  // AsyncStorage is async (unlike localStorage), so the stored preference
  // is applied after mount; until then the device language is used.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "en" || stored === "es") setLanguageState(stored);
    });
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {
      // Non-fatal: the choice just won't persist across restarts.
    });
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
