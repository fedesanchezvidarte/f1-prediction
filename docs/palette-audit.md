# Palette Audit — Theming & Palette Polish

WCAG 2.1 contrast audit of the F1 brand palette on both apps' dark and light surfaces,
and the token values adopted from it. Ratios computed with the WCAG relative-luminance
formula. Targets: **4.5:1** for normal text (AA), **3:1** for large text and UI
components / graphical objects (AA).

## Surfaces

Both apps now share the same layered surface system (previously web-only):

| Token | Dark | Light | Notes |
|---|---|---|---|
| `background` | `#0d0d0d` | `#f4f4f5` | Mobile previously used `#2A2B2A` as the page background — it reads gray and washes out the red (red-on-`#2A2B2A` was only **2.70:1**). `#2A2B2A` survives as the static `f1-black` graphite tone (text on amber fills, decorative surfaces), never as a page background. |
| `card` | `#1a1a1a` | `#ffffff` | |
| `card-hover` | `#222222` | `#ececed` | |
| `border` | `#2a2a2a` | `#e4e4e7` | |
| `border-hover` | `#3a3a3a` | `#d4d4d8` | |
| `input-bg` | `#141414` | `#fafafa` | |
| `foreground` | `#F7F7F7` | `#09090b` | 18.14:1 dark / 17.85:1 light |
| `muted` | `#8a8a8a` (was `#737373`) | `#71717a` | Old dark muted was **3.67:1 on card** — below AA for the secondary text it labels. New value: **5.63:1** on background, **5.04:1** on card. Light value already passed (4.40 / 4.83). |

## Brand colors — dark theme

The user-reported issue — "red on dark isn't polished" — is real and measurable, and
web was worse than mobile: the web dark token `oklch(44.7% 0.183 20.5)` ≈ `#a20024`
sat at **2.37:1** on `#0d0d0d` (fails even the 3:1 UI minimum).

A mathematical note on red: a single token cannot reach 4.5:1 both **as text on the
card** and **under white button labels** — that would need a card-to-white span of
4.5 × 4.5 ≈ 20:1, and white↔`#1a1a1a` is only 16.25:1. `#E23B4C` is the max-min
compromise: it maximizes the *worse* of the two ratios, passes AA as text on the page
background, and passes AA-large / UI (3:1) everywhere else.

| Token | Old (web dark) | Old (mobile) | **New (dark)** | on `#0d0d0d` | on `#1a1a1a` | white on fill |
|---|---|---|---|---|---|---|
| `f1-red` | `#a20024` (2.37) | `#CF2637` (3.69) | **`#E23B4C`** — `oklch(60.8% 0.202 20.4)` | **4.59** | 4.11 | 4.23 |
| `f1-red-hover` | `#8d001b` | `#B21E2D` | **`#C62F3F`** — `oklch(54.7% 0.186 20.6)` | 3.55 | 3.18 | 5.41 |
| `f1-purple` | `#8b60c3` (4.22) | `#A06CD5` | **`#A06CD5`** — `oklch(63.0% 0.159 305.1)` | **5.18** | 4.64 | — |
| `f1-amber` | `#f29e00` (8.95) | `#FFB100` | **`#FFB100`** — `oklch(81.4% 0.170 76.9)` | **10.68** | 9.56 | (dark label: 7.81) |
| `f1-green` | `#24a45b` (6.05) | `#44AF69` | **`#44AF69`** — `oklch(67.4% 0.143 151.9)` | **7.02** | 6.28 | — |
| `f1-blue` | `#008bd1` (5.20) | `#3C91E6` | **`#3C91E6`** — `oklch(64.6% 0.151 251.4)` | **5.91** | 5.29 | — |

Dark theme keeps the original brand hexes for purple/amber/green/blue (the mobile
values were already the stronger set); web's darker oklch variants are dropped.

## Brand colors — light theme

Previously web served the *same* brand tokens on light backgrounds, where most fail:
amber `#FFB100` (1.82:1 on white), green (2.77), blue (3.29), purple (3.75). The light
theme now serves darkened same-hue variants instead of banning the colors:

| Token | Old (both themes) | on `#f4f4f5` | **New (light)** | on `#f4f4f5` | on `#ffffff` | white on fill |
|---|---|---|---|---|---|---|
| `f1-red` | `#CF2637` | 4.79 | **`#C0202F`** — `oklch(52.3% 0.193 23.2)` | **5.48** | 6.02 | **6.02** |
| `f1-red-hover` | `#B21E2D` | 6.13 | **`#A81B29`** — `oklch(47.4% 0.174 22.8)` | 6.69 | 7.36 | 7.36 |
| `f1-purple` | `#A06CD5` | 3.41 | **`#7443B8`** — `oklch(50.1% 0.177 299.2)` | **5.90** | 6.49 | 6.49 |
| `f1-amber` | `#FFB100` | 1.66 | **`#96610A`** — `oklch(53.8% 0.112 71.2)` | **4.76** | 5.24 | 5.24 |
| `f1-green` | `#44AF69` | 2.52 | **`#25784A`** — `oklch(51.1% 0.108 155.0)` | **4.94** | 5.43 | 5.43 |
| `f1-blue` | `#3C91E6` | 2.99 | **`#1C6DBD`** — `oklch(53.1% 0.146 252.6)` | **4.81** | 5.29 | 5.29 |

In the light theme every brand color passes AA for normal text on both surfaces *and*
under white fill labels — the light span is wide enough that no compromise is needed.

## New token: `on-bright`

Amber and green fills carry dark graphite labels in the dark theme (`#2A2B2A` on
`#FFB100` = **7.81:1**, on `#44AF69` = **5.13:1**), but the light theme's `#96610A` /
`#25784A` variants are themselves dark, so graphite labels would drop to 2.71:1 /
1.43:1. `on-bright` flips the label: `#2A2B2A` (dark) / `#ffffff` (light — **5.24:1**
on amber, **5.43:1** on green). Anything rendering text or a spinner on an amber or
green fill uses it instead of `text-black` / hard-coded graphite.

## Known accepted marginals (documented, not hidden)

- Dark `f1-red` as *normal-size* text on cards: 4.11:1 (passes 3:1 UI/large-text; most
  red-on-card is icons, bold labels, or badges).
- White labels on dark `f1-red` fills: 4.23:1 (passes AA-large; button labels are
  semibold). The light theme equivalents fully pass at 6.02:1.
- `text-foreground/40`-style tertiary text (timestamps, footnotes) sits below 4.5:1 by
  design in both themes; anything meaningful uses `/60`+ or `muted`.

## Where the values live

- Web: `apps/web/app/globals.css` — per-theme CSS variables (`:root`/`.dark` and `.light`), brand tokens mapped through `@theme inline`.
- Mobile: `apps/mobile/src/global.css` (`:root` light / `.dark:root` dark, RGB-triplet variables consumed as `rgb(var(--x) / <alpha-value>)` in `tailwind.config.js`) and `apps/mobile/src/theme/palette.ts` (the same hexes as plain data for navigator style objects, icons, and spinners).

The two apps share identical semantic token names and identical hex values per theme.
