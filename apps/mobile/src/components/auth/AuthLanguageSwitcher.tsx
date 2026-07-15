import { Pressable, Text, View } from "react-native";

import { useLanguage, type Language } from "@/providers/LanguageProvider";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

/** EN/ES pill toggle for the auth screens — mirrors the web AuthLanguageSwitcher. */
export function AuthLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <View className="flex-row items-center gap-0.5 rounded-full border border-foreground/10 bg-foreground/5 p-0.5">
      {LANGUAGES.map(({ code, label }) => (
        <Pressable
          key={code}
          onPress={() => setLanguage(code)}
          accessibilityRole="button"
          accessibilityState={{ selected: language === code }}
          className={`rounded-full px-2.5 py-1 ${
            language === code ? "bg-f1-red" : ""
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              language === code ? "text-white" : "text-foreground/50"
            }`}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
