# Design Tokens

Source of truth: `src/app/globals.css` (Tailwind 4 `@theme inline` + CSS custom properties in OKLCH).
Change a token there and every component follows. The Flutter app mirrors these values.

## Colour (light → dark redefined under `.dark`)

| Token | Light | Role |
| --- | --- | --- |
| `--primary` | `oklch(0.52 0.13 160)` — academic green | Primary actions, active nav, focus ring |
| `--secondary` / `--accent` | soft green tints | Selected chips, hover surfaces |
| `--muted` / `--muted-foreground` | neutral 255° hue | Backgrounds, secondary text |
| `--destructive` | `oklch(0.58 0.22 27)` | Destructive actions, errors |
| `--success` | `oklch(0.6 0.15 150)` | Correct answers, completed |
| `--warning` | `oklch(0.78 0.15 75)` | Warnings, pending review (dark text on it) |
| `--info` | `oklch(0.6 0.15 245)` | Informational states |
| `--chart-1…5` | green, blue, amber, red, violet | Charts, in this order (`SERIES` in `components/charts/kit.tsx`) |
| `--sidebar-*` | | Portal sidebar surface |

Semantic use only: components reference `bg-primary`, `text-muted-foreground`, `bg-success/15` and so on,
never raw colours. Subject accents for subject icons live in curriculum data.

**High contrast:** `html[data-contrast="high"]` (light and dark variants) strengthens borders, foreground and
focus outlines. It is toggled from Settings → Appearance and persisted in preferences.

## Typography

- `--font-sans` / `--font-heading`: **Inter** (Latin) + **Hind Siliguri** (Bangla), loaded with `next/font`
  (`src/config/fonts.ts`).
- Utility scale: `text-display`, `text-h1…h3`, `text-caption`, plus Tailwind sizes. Bangla text uses relaxed
  line-height for conjuncts and maths.
- Text size preference (Settings) scales the root font size.

## Shape, spacing, layout

| Token | Value |
| --- | --- |
| `--radius` | base; `--radius-sm…4xl` derived (×0.6 … ×2.6) |
| `--spacing-sidebar` / `--spacing-sidebar-collapsed` | 16rem / 4.5rem |
| `--spacing-header` | 4rem |
| Elevation | `shadow-sm` on cards, `shadow-lg` for hero/demo cards and dialogs only |

## Motion

Framer Motion with short (≤450 ms) fades and slides. `useReducedMotion()` and the reduced-motion preference turn
them off. No looping decorative animations, apart from the voice waveform while active.
