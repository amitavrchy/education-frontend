# Accessibility

Target: **WCAG 2.2 AA** where applicable. Status: built in throughout, but **no formal audit yet** (tracked as
partial in the feature matrix, A11Y-05/06).

## Implemented

- Semantic landmarks, a skip-to-content link and one `h1` per page.
- Keyboard: every action reachable. ⌘K global search. Exam runner shortcuts (← → navigate, 1–4 choose, M mark,
  Ctrl+Enter submit). Visible `:focus-visible` rings, strengthened in high-contrast mode.
- Forms: labels bound to inputs, `aria-invalid` + `aria-describedby` for errors, and messages that say how to fix.
- Live regions: streaming tutor replies and voice transcripts use `aria-live="polite"`.
- Colour: semantic tokens with sufficient contrast. High-contrast mode (`data-contrast="high"`). Status is never
  shown by colour alone (icons and text accompany it).
- Motion: `prefers-reduced-motion` plus an in-app reduced-motion preference.
- Text scaling: in-app text size and layouts tolerant of 200% zoom.
- Language: full Bangla and English UI, `lang` attribute, optional Bangla numerals.
- Media: transcripts for voice and audio lessons. Alt text required for diagrams (`Diagram` component, lab diagrams).
- Charts: `role="img"` with descriptive labels; data is also available as tables or CSV in admin.

## Before production

1. Automated axe scan on all routes (add `@axe-core/playwright` to the e2e suite).
2. Manual screen-reader pass (NVDA + TalkBack) on student core journeys and the exam runner.
3. Contrast check of chart palettes in dark mode.
4. Usability test with Bangla-medium students on low-end Android devices.
