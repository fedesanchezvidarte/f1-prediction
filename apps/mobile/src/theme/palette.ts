/**
 * Theme palettes as plain data, for the places NativeWind classes can't
 * reach: navigator style objects (contentStyle/drawerStyle/sceneStyle/
 * tabBarStyle), Ionicons `color` props, ActivityIndicator, StatusBar.
 *
 * These hexes are the single mobile source of truth and mirror the CSS
 * variables in src/global.css (classes) and apps/web/app/globals.css (web) —
 * both apps share the same semantic palette. Contrast ratios for every value
 * are documented in docs/palette-audit.md; change them together.
 */
export interface ThemeColors {
  /** Page background (dark: near-black so brand colors don't wash out). */
  background: string;
  card: string;
  cardHover: string;
  border: string;
  borderHover: string;
  /** Secondary/placeholder text — AA on background and card in both themes. */
  muted: string;
  inputBg: string;
  /** Primary text. */
  foreground: string;
  /** foreground at 50% over background — icon tint for secondary glyphs. */
  foregroundMuted: string;
  red: string;
  redHover: string;
  purple: string;
  amber: string;
  green: string;
  blue: string;
  /** Label color on bright brand fills (amber/green buttons, spinners). */
  onBright: string;
  /** Static graphite (the old #2A2B2A) — surface/label tone, never a page background. */
  graphite: string;
}

export const darkColors: ThemeColors = {
  background: "#0d0d0d",
  card: "#1a1a1a",
  cardHover: "#222222",
  border: "#2a2a2a",
  borderHover: "#3a3a3a",
  muted: "#8a8a8a",
  inputBg: "#141414",
  foreground: "#F7F7F7",
  foregroundMuted: "rgba(247,247,247,0.5)",
  red: "#E23B4C",
  redHover: "#C62F3F",
  purple: "#A06CD5",
  amber: "#FFB100",
  green: "#44AF69",
  blue: "#3C91E6",
  onBright: "#2A2B2A",
  graphite: "#2A2B2A",
};

export const lightColors: ThemeColors = {
  background: "#f4f4f5",
  card: "#ffffff",
  cardHover: "#ececed",
  border: "#e4e4e7",
  borderHover: "#d4d4d8",
  muted: "#71717a",
  inputBg: "#fafafa",
  foreground: "#09090b",
  foregroundMuted: "rgba(9,9,11,0.5)",
  red: "#C0202F",
  redHover: "#A81B29",
  purple: "#7443B8",
  amber: "#96610A",
  green: "#25784A",
  blue: "#1C6DBD",
  onBright: "#ffffff",
  graphite: "#2A2B2A",
};
