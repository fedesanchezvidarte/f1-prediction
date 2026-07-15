import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme as nativewindColorScheme, useColorScheme } from "nativewind";
import { createContext, useContext, useEffect, useState } from "react";

import { darkColors, lightColors, type ThemeColors } from "@/theme/palette";

export type ThemePreference = "dark" | "light" | "system";

const STORAGE_KEY = "theme";

// The app defaults to dark (matching web); applying it at module load means
// the very first frame already renders with the dark variable set instead of
// flashing the light `:root` defaults from global.css.
nativewindColorScheme.set("dark");

interface ThemeContextType {
  /** The stored preference — what the selector in settings shows. */
  theme: ThemePreference;
  /** The scheme actually rendered ("system" resolved via Appearance). */
  resolvedTheme: "dark" | "light";
  setTheme: (theme: ThemePreference) => void;
  /** Palette for style objects NativeWind can't reach (navigators, icons). */
  colors: ThemeColors;
}

// Same context shape as the web ThemeProvider (theme/setTheme), extended with
// resolvedTheme + colors for React Navigation style objects; the backing
// store is AsyncStorage instead of localStorage.
const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
  colors: darkColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");
  // NativeWind resolves "system" against Appearance and re-renders on OS
  // theme changes, so it is the single source of truth for the active scheme.
  const { colorScheme } = useColorScheme();

  // AsyncStorage is async (unlike localStorage), so the stored preference is
  // applied after mount; until then the dark default set above is used.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "dark" || stored === "light" || stored === "system") {
        setThemeState(stored);
        nativewindColorScheme.set(stored);
      }
    });
  }, []);

  function setTheme(next: ThemePreference) {
    setThemeState(next);
    nativewindColorScheme.set(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Non-fatal: the choice just won't persist across restarts.
    });
  }

  const resolvedTheme: "dark" | "light" = colorScheme === "light" ? "light" : "dark";

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        colors: resolvedTheme === "light" ? lightColors : darkColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
