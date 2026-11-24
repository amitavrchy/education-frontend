# PROGRESS — education-frontend

Living handoff log so a later session can continue. Newest entries at the top of the log.
Feature-level status lives in `docs/product/FEATURE_MATRIX.md` (generated — edit
`scripts/feature-matrix/status.mjs`, then `npm run docs:matrix`).

## Ground rules (from the user, this repo only)

- This repo = Next.js app: student web, marketing site, admin, teacher/reviewer, parent
  portals (route groups + role guards), docs, shared contracts and mock data. Flutter is a separate repo.
- Do **not** edit `docs/MASTER_PROMPT.md`.
- `NEXT_PUBLIC_USE_MOCK_API` stays `true`; the frontend must never hit real APIs.
- Dev server on **port 3001** (3000 belongs to another project). Stop it after use.
- Commit coherent chunks (author amitavrchy). Push to GitHub (`amitavrchy` account) when the user asks, so work
  can continue from another PC.

## Architecture decisions

| Decision | Why |
| --- | --- |
| Keep the existing "ShikkhaAI" brand, centralised in `src/config/site.ts` + env | Master prompt asks for a centrally swappable temporary name; repo already chose ShikkhaAI. Changing `NEXT_PUBLIC_APP_NAME` rebrands everything. |
| 4 portals (`student`, `parent`, `teacher`, `admin`) host 8 roles | Teacher portal = teacher + content reviewer; admin = content manager, support, platform admin, super admin. Navigation is filtered by permissions. The institution portal (school/college admin) was removed on 2026-11-24. |
| All domain data goes through repositories in `src/services/**` | UI never imports mock data directly; `NEXT_PUBLIC_USE_MOCK_API=false` swaps **every** repository (factory-level switch in `services/core/repository.ts`) to a REST adapter with the same interface. |
| Mock DB = IndexedDB (one store, one record per collection) with in-memory fallback | Survives reloads, resettable from Settings, works in tests via fake-indexeddb. |
| Preferences (locale, theme extras, dashboard layout) in localStorage via Zustand | Prompt: localStorage only for lightweight settings. |
| Dynamic routes render `params.then(...)` inside `<Suspense>` | Next 16 + `cacheComponents`: avoids blocking prerender without `generateStaticParams`. |
| Data fetching is client-side (TanStack Query) | Mock data lives in the browser (IndexedDB); server renders skeletons. |
| Removed scaffold sections not in the master prompt (student videos/community/career/scholarships, institution branches, admin ai-monitoring/model-tests/payments split) | Spec-driven scope; their content is covered by spec modules (e.g. payments live under subscriptions & billing). |

## Plan / phases

1. ✅ Inspect repo, install deps, feature inventory
2. ✅ Core: contracts, roles/permissions, i18n, mock DB + repositories, shell
3. ✅ Auth + onboarding + marketing site
4. ✅ Student modules (all §6–§26)
5. ✅ Teacher/reviewer, institution, parent portals
6. ✅ Admin dashboard modules (§30–§42)
7. ✅ Tests (Vitest 63, Playwright 25), docs set from §57, audit + fixes

**Status (2026-11-24):** 1,087 features — 1,084 done, 3 partial (formal a11y audit ×2, broader component
tests). See `docs/testing/FEATURE_ACCEPTANCE_REPORT.md` and `docs/testing/KNOWN_LIMITATIONS.md`.

**Suggested next steps:** axe accessibility checks in e2e + manual screen-reader pass; component tests for
exam runner / question editor / onboarding; JSON-schema export of `src/contracts` for the Flutter repo;
Lighthouse budget on a low-end device profile; backend endpoints per `docs/architecture/BACKEND_INTEGRATION_PLAN.md`.

## Continue on another PC

1. `git clone https://github.com/amitavrchy/education-frontend.git && cd education-frontend && npm install`
2. `cp .env.example .env.local` (keep `NEXT_PUBLIC_USE_MOCK_API=true`), `npm run dev -- -p 3001`
3. Start Claude Code in the repo and say: *"Read docs/MASTER_PROMPT.md, PROGRESS.md and
   docs/product/FEATURE_MATRIX.md; continue implementing the remaining incomplete features."*
4. Verify: `npm run check` and `npm run test:e2e` (first time: `npx playwright install chromium`).

## Log

### 2026-11-24 — session 6b (scope cut: institution portal + guardian consent)
- Product decision from the user:
  - Schools/colleges are no longer onboarded as clients.
  - Students under 18 no longer need guardian permission.
- Removed (institution):
  - `school_admin` / `college_admin` roles and the `institution.*` permissions.
  - The whole `/institution/*` portal and its components, and admin `/admin/institutions`.
  - The institution plan and its `SCHOOL30` coupon (replaced by `FAMILY30`).
  - Institution exam kind (seed exams became teacher-assigned).
  - Marketing `/for-schools` and `/for-colleges`.
  - The avatar on/off per institution.
  - Institution notifications and demo logins.
- Kept:
  - The student "school & college questions" archive and its admin moderation.
  - A student's school affiliation (onboarding, settings, admin user detail).
  - The `Institution` directory data that the archive uses.
- Removed (guardian consent):
  - The under-18 checkbox at signup and `/consent/guardian` with its screen.
  - `ConsentRecord`, `consentRepo` and `consentService`.
  - `UserAccount.consent` and `profile.guardian.consent`.
  - The admin moderation consent tab, admin consent column/filter/stat, and the system min-age setting.
  - Consent records in the parent privacy page.
  - The guardian-consent wording on the site, help and FAQ.
  - The parent portal stays; guardians still see only what the student shares.
- Feature matrix: new 🚫 Removed status (37 features). `npm run docs` regenerated.
- Verification:
  - Typecheck clean, lint 0 errors. 70/70 unit, 26/26 e2e.
  - Removed routes return 404, and changed pages were smoke-tested per role with no console errors.

### 2026-11-24 — session 6 (per-book avatar teacher)
- New main feature: every book has its own live 2D teacher avatar.
  - Students ask by text or voice. The avatar answers only from that book, with page citations, and declines
    anything outside the book.
  - All mock/static for now. The API comes later; see `docs/api/BOOK_AVATAR_CONTRACT.md`.
- Panels:
  - Student: gallery and classroom.
  - Admin: editor, test chat and reports. Uploading a book auto-creates its avatar, and the books table links
    to it.
  - Teacher: own subjects, plus report fixes.
  - Parent: counts only.
  - The book reader has an "ask this book's teacher" button.
- Code: `src/components/avatar/*`, `src/services/avatar.service.ts`, `src/services/ai/book-avatar-engine.ts`.
- Fixes:
  - Avatar crash: negative palette index from a signed shift.
  - Every avatar got the same name and gender: hash low bits. Now uses an fmix32 mixer.
  - Satisfaction % was off by ×100.
  - `toSpoken` read markdown link URLs aloud.
  - Sheet `sm:max-w-*` overrides were ignored app-wide, so every wide sheet rendered at `max-w-sm`.
    `ui/sheet.tsx` now lets callers override the width.
- Tests: `tests/unit/book-avatar.test.ts` (9) and `tests/e2e/avatar.spec.ts` (2).
- Verification:
  - Typecheck clean, lint 0 errors. 72/72 unit, 27/27 e2e. `next build` OK.
  - All 6 avatar routes smoke-tested per role with no console errors.
- Not done yet: the Flutter counterpart; real API, TTS and STT.
- Node on this PC: the old install was quarantined. A fresh official Node 22 is in `~/.local/node`
  (PATH set in `~/.zshrc`).

### 2026-11-24 — session 5
- Audited the repo against the master prompt. Gaps found: admin (12 of 17 pages missing, 5 components
  unrouted), marketing site (homepage only), tests, §57 docs, feature-matrix statuses.
- Built the admin modules and routes: questions (+ bulk import, duplicate detection), board questions,
  institution questions, exams, content review, knowledge base, users, teachers, institutions,
  subscriptions & billing, moderation, security & audit (`src/components/admin/*`).
- Built the public website: home with interactive demos, features, pricing, 4 audience pages, FAQ, contact,
  about, help, terms, privacy, accessibility (`src/components/marketing/*`).
- Student simplified content coverage view (§46) on the subject overview.
- Tests: Vitest config + 63 unit/component tests; Playwright config + 25 journeys.
- Bugs fixed (found by tests): flashcard interval date overflow; blank timestamps overriding repository
  stamps; tutor losing curriculum version while the profile loads (no citations on the first question);
  React purity lint errors (`useNow` hook); every repository now honours `NEXT_PUBLIC_USE_MOCK_API`.
- Docs: all of §57 + README; `npm run docs` regenerates the feature matrix + screen inventory.
- Verification: typecheck clean, lint 0 errors, 63/63 unit, 25/25 e2e, `next build` OK, every route smoke-tested
  per role with no console errors.

### 2026-11-23 — session 4
- Fixed WIP lint errors; verified AI tutor works end-to-end (Playwright flow).
- Built: student dashboard (customisable widgets), study planner (board/calendar/timeline/list, drag
  reschedule), flashcards (SM-2 study + quick review + generators), notes (Tiptap, autosave, history,
  links, print), library + PDF reader (sample PDFs via `npm run pdf:samples`), board archive (synthetic,
  9 boards x 10 years, HSC 2020 omitted) + institution archive, adaptive analytics, achievements,
  offline page + service worker (prod only), shared notification center / settings / subscription
  (checkout simulator) for all portals, global search page + `services/search-registry.ts`,
  voice tutor (VoiceAdapter mock + device speech APIs), photo solver (OCR fixtures).
- New services: offline, archive (board + institution papers), billing, voice, ocr.
- Verification: `npm run typecheck`, smoke + interaction scripts with Playwright against `next dev -p 3001`.

### 2026-11-23 — sessions 2–3
- Core shell, auth & onboarding, learning engine foundations (2732ec3).
- Curriculum explorer, question bank, practice sets (41e9263).
- Online exam system and results (76566ec).
- AI tutor (page, components, mock scenarios, tutor/kb/notes/flashcards/usage services) started;
  stopped mid-way at the usage limit and committed as WIP — **unverified, may not build yet**.
- Next: finish AI tutor → voice tutor → image solver → library → board/institution archives →
  planner/adaptive/flashcards/notes UI → remaining student modules → portals → admin → tests/docs.


### 2026-11-23 — session 1
- Read master prompt; inspected scaffold (Next 16.4, React 19.3, Tailwind 4, shadcn nova, TanStack Query, Zustand).
- Installed: katex, react-markdown/remark-math/rehype-katex, TanStack Table v8 + Virtual, Tiptap, pdfjs-dist, cmdk,
  Vitest + Testing Library + jsdom + fake-indexeddb, Playwright. Added 14 shadcn primitives.
- Created feature matrix generator (1,087 features).
