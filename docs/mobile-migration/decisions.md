# Mobile Migration — Decision Log

Running record of decisions made after the initial plan. Newest first.

## 2026-07-08 — Expo SDK 54, not 57 (Phase 1)

**Decision:** `apps/mobile` targets **Expo SDK 54** (RN 0.81, React 19.1) instead of SDK 57.

**Why:** The App Store build of Expo Go supports one SDK version at a time — currently 54
during the SDK 57 transition ([Expo docs](https://docs.expo.dev/get-started/create-a-project/)).
The plan's free-testing ladder (Phases 1, 3, 4 in Expo Go on a physical iPhone) is only
possible on SDK 54; SDK 57 would force paid EAS dev builds from day one.

**Consequences / gotchas hit while switching:**
- `@expo/vector-icons` must stay on `~15.0.3` — the `^` range pulls 15.1.x (SDK 57 track),
  which drags `expo-font@57` → a second `react-native@0.86` into the tree. Symptoms of the
  dupe: NativeWind `className` type errors (augmentation lands on the wrong RN copy) and
  `hermesc` failing on private class fields (`this.#x`) that SDK 54's Hermes can't parse.
- `babel-preset-expo` is an explicit devDependency pinned `~54.0.11` (required for the
  custom `babel.config.js`; the floating version resolves to 57.x which skips lowering
  private class fields).
- Revisit after Expo Go moves to SDK 57 (or when Phase 2's native auth modules force EAS
  dev builds anyway): bump `expo` + run `npx expo install --fix`, unpin vector-icons.

## 2026-07-08 — Pin eslint-plugin-react-hooks to 7.0.1 (web)

**Decision:** `apps/web` pins `eslint-config-next@16.1.6` (exact) + `eslint-plugin-react-hooks@7.0.1`.

**Why:** Regenerating the lockfile floated the hooks plugin to 7.1.x, whose new rules
(`react-hooks/refs`, `react-hooks/set-state-in-effect`) flag ~10 pre-existing issues in
`RacePredictionContent.tsx`. Pinning restores lint-gate parity; upgrading + fixing the
findings is a separate task, out of scope for the mobile scaffold branch.
