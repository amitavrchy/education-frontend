# Feature Acceptance Report — education-frontend

Date: 2026-11-24 · Scope: Next.js web (public site, student, parent, teacher/reviewer, institution, admin).

## Result

| Check | Result |
| --- | --- |
| Feature matrix | **1,087 features: 1,084 done, 3 partial, 0 todo** ([FEATURE_MATRIX.md](../product/FEATURE_MATRIX.md)) |
| Routes | 129 routes ([SCREEN_INVENTORY.md](../product/SCREEN_INVENTORY.md)) |
| Route smoke | Every route of every portal opened with its role in Chromium: all render, **0 console errors** |
| Typecheck | `tsc --noEmit` clean |
| Lint | 0 errors (18 warnings: `set-state-in-effect` and `exhaustive-deps` advisories) |
| Unit/component tests | **63/63 pass** (Vitest) |
| E2E journeys | **25/25 pass** (Playwright; desktop + mobile tags) |
| Production build | `next build` succeeds |

## Partial items

| ID | Gap | Plan |
| --- | --- | --- |
| A11Y-05 | Keyboard/focus built in; no formal WCAG 2.2 AA audit or screen-reader pass | axe in e2e + manual NVDA/TalkBack pass |
| A11Y-06 | Accessible forms built; not audited | same |
| TEST-02 | Component tests cover DataTable only | add tests for exam runner, question editor, onboarding wizard |

## Defects found by the new tests and fixed

| Defect | Impact | Fix |
| --- | --- | --- |
| Flashcard interval grew without bound and produced an invalid date (`RangeError`) after many "easy" reviews | Long-term flashcard decks could crash scheduling | Interval capped at 365 days (`MAX_INTERVAL_DAYS`) |
| Blank `createdAt`/`updatedAt` from form defaults overrode repository timestamps | Records created from admin forms could have empty dates | Repository ignores blank timestamps |
| Tutor context lost the curriculum version while the student profile was still loading | The first question in a fresh session got no textbook citations, and the broken context was saved on the conversation | `defaultContext` ignores undefined values; send waits for the profile |
| React purity / ref-ordering lint errors in dashboard, planner and audio player | Possible unstable renders under React Compiler | `useNow()` hook; effect-synced refs; function ordering |
| 81 of 82 repositories ignored `NEXT_PUBLIC_USE_MOCK_API` | Switching to a real API would have needed code changes in every service | Repository factory switches every repository to its REST adapter |

## Work completed this session

- **Admin dashboard (§30–42):** 12 new modules and routes for all 17 nav items: question management (editor,
  versions, reviewer assignment, bulk publish, CSV/Excel/Word/PDF/image import with duplicate detection), board
  paper management (upload → OCR → split → chapter map, authenticity, frequency), institution paper moderation,
  exam management (wizard, templates, answer key, grade override, result publication), AI knowledge base (sources,
  chunks, retrieval simulator, prompts with version diff/rollback, models/routing/policy, cost, quality evals,
  logs), users, teachers/reviewers, institutions, subscriptions & billing (plans, coupons, refunds, invoices,
  checkout simulator, revenue analytics), moderation (reports, privacy requests, consent review), security &
  audit (permission matrix, audit log, alerts, sessions, masked API keys, system config).
- **Public website (§47):** interactive homepage (tutor, voice and quiz demos), features, live-plan pricing,
  four audience pages, searchable FAQ, validated contact form, about, help, terms, privacy, accessibility.
- **Student content coverage view (§46).**
- **Tests, docs (§57), feature matrix statuses.**

## Sign-off notes

Everything mock-only is identifiable in the UI. Production readiness still needs backend endpoints for the
composite operations, server-side authorisation, an accessibility audit and legal review of policy pages (see
[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)).
