/** Semantic token backed by a CSS variable from src/global.css; the
 * rgb(var()/<alpha-value>) form keeps opacity modifiers (e.g. /50) working. */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  // Theme switching is class-based, driven by NativeWind's colorScheme from
  // src/providers/ThemeProvider.tsx (persisted to AsyncStorage, default dark).
  darkMode: "class",
  theme: {
    extend: {
      // Same palette names as the web app (apps/web/app/globals.css) so
      // class names transfer 1:1 between the two UIs. Values flip with the
      // theme via the variables in src/global.css; the equivalent hexes for
      // navigator/icon style objects live in src/theme/palette.ts.
      colors: {
        background: token("background"),
        card: token("card"),
        "card-hover": token("card-hover"),
        border: token("border"),
        "border-hover": token("border-hover"),
        muted: token("muted"),
        "input-bg": token("input-bg"),
        foreground: token("foreground"),
        "f1-red": token("f1-red"),
        "f1-red-hover": token("f1-red-hover"),
        "f1-purple": token("f1-purple"),
        "f1-amber": token("f1-amber"),
        "f1-green": token("f1-green"),
        "f1-blue": token("f1-blue"),
        // Label color on bright brand fills (amber/green): graphite in dark,
        // white in light — see docs/palette-audit.md.
        "on-bright": token("on-bright"),
        // Theme-aware near-white, same trick as web's --fw: flips to
        // near-black in the light theme so text-f1-white adapts.
        "f1-white": token("foreground"),
        // Static graphite (never a page background — 1.37:1 vs the dark bg).
        "f1-black": "#2A2B2A",
      },
    },
  },
  plugins: [],
};
