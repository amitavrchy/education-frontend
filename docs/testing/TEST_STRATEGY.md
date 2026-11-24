# Test Strategy

| Layer | Tool | Location | Run |
| --- | --- | --- | --- |
| Static | TypeScript, ESLint (React Compiler rules) | — | `npm run typecheck`, `npm run lint` |
| Unit / service | Vitest + jsdom + fake-indexeddb | `tests/unit/*.test.ts` | `npm test` |
| Component | Vitest + Testing Library | `tests/unit/*.test.tsx` | `npm test` |
| End-to-end | Playwright (Desktop Chrome; `@mobile` tests also on Pixel 7) | `tests/e2e/*.spec.ts` | `npm run test:e2e` |
| Route smoke | Playwright script that visits every route per role and fails on console errors | ad hoc (see QA checklist) | — |
| Build | `next build` | — | `npm run build` |

`npm run check` runs typecheck, lint, unit tests and build.

## Unit coverage (63 tests)

- `exam-scoring` — objective grading for every type, unanswered detection, negative marking, scaling, grade bands.
- `flashcards` — SM-2-lite ladder, ease bounds, interval cap (regression for the date-overflow bug).
- `validation` — BD phone numbers, login and sign-up schemas.
- `repository` — pagination, filter/search (Bangla + English), sort, CRUD, timestamps, bulk ops, IndexedDB
  persistence across reload, REST path convention.
- `permissions` — 10 roles → portals, isolation, sensitive capabilities, every nav item has a route, support
  cannot open authoring pages.
- `content-utils` — duplicate similarity, LaTeX → plain text, question bank filters and search.
- `billing` — coupon maths and validation; checkout success, failure, pending → confirm; cancel/resume.
- `progress` — results move topic mastery up/down, XP/activity logging, chapter completion.
- `tutor` — context defaults survive undefined profile fields (regression), retrieval relevance.
- `data-table` — loading, empty, error + retry, search, bulk actions.

## E2E journeys (25)

`access.spec` (4) · `marketing.spec` (5, homepage also on mobile) · `admin.spec` (6) · `student.spec` (8,
language/theme also on mobile). See [`USER_JOURNEYS.md`](../product/USER_JOURNEYS.md) for the mapping.

E2E runs against the dev server on port 3001 (`reuseExistingServer`). Each test gets a fresh browser profile,
so IndexedDB starts from seed. Tests that switch users within one profile use `logout()` (clears the auth key
only), so data written by the first user is visible to the second.

## Conventions

- Prefer role/label selectors. Strings are Bangla because the default locale is `bn`.
- Wait for the success toast before navigating away after a mutation (writes are async).
- Mock latency is zero in unit tests (`configureMockRuntime({ latencyScale: 0 })`).
