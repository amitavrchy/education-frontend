# PROGRESS — education-frontend

Living handoff log so a later session can continue. Newest entries at the top of the log.
Feature-level status lives in `docs/product/FEATURE_MATRIX.md` (generated — edit
`scripts/feature-matrix/status.mjs`, then `npm run docs:matrix`).

## Ground rules (from the user, this repo only)

- This repo = Next.js app: student web, marketing site, admin, teacher/reviewer, institution, parent
  portals (route groups + role guards), docs, shared contracts and mock data. Flutter is a separate repo.
- Do **not** edit `docs/MASTER_PROMPT.md`.
- `NEXT_PUBLIC_USE_MOCK_API` stays `true`; the frontend must never hit real APIs.
- Dev server on **port 3001** (3000 belongs to another project). Stop it after use.
- Commit coherent chunks locally (author amitavrchy). **Never push.**

## Architecture decisions

| Decision | Why |
| --- | --- |
| Keep the existing "ShikkhaAI" brand, centralised in `src/config/site.ts` + env | Master prompt asks for a centrally swappable temporary name; repo already chose ShikkhaAI. Changing `NEXT_PUBLIC_APP_NAME` rebrands everything. |
| 5 portals (`student`, `parent`, `teacher`, `institution`, `admin`) host 10 roles | Teacher portal = teacher + content reviewer; institution = school + college admin; admin = content manager, support, platform admin, super admin. Navigation is filtered by permissions. |
| All domain data goes through repositories in `src/services/**` | UI never imports mock data directly; `NEXT_PUBLIC_USE_MOCK_API=false` swaps to REST adapters with the same interface. |
| Mock DB = IndexedDB (one store, one record per collection) with in-memory fallback | Survives reloads, resettable from Settings, works in tests via fake-indexeddb. |
| Preferences (locale, theme extras, dashboard layout) in localStorage via Zustand | Prompt: localStorage only for lightweight settings. |
| Dynamic routes render `params.then(...)` inside `<Suspense>` | Next 16 + `cacheComponents`: avoids blocking prerender without `generateStaticParams`. |
| Data fetching is client-side (TanStack Query) | Mock data lives in the browser (IndexedDB); server renders skeletons. |
| Removed scaffold sections not in the master prompt (student videos/community/career/scholarships, institution branches, admin ai-monitoring/model-tests/payments split) | Spec-driven scope; their content is covered by spec modules (e.g. payments live under subscriptions & billing). |

## Plan / phases

1. ✅ Inspect repo, install deps, feature inventory
2. ⏳ Core: contracts, roles/permissions, i18n, mock DB + repositories, shell (guards, role switcher, search palette, notifications, offline)
3. Auth + onboarding + marketing site
4. Student modules
5. Teacher/reviewer, institution, parent portals
6. Admin dashboard modules
7. Tests (Vitest + Playwright), docs set from §57, audit + fixes

## Log

### 2026-11-23 — session 1
- Read master prompt; inspected scaffold (Next 16.4, React 19.3, Tailwind 4, shadcn nova, TanStack Query, Zustand).
- Installed: katex, react-markdown/remark-math/rehype-katex, TanStack Table v8 + Virtual, Tiptap, pdfjs-dist, cmdk,
  Vitest + Testing Library + jsdom + fake-indexeddb, Playwright. Added 14 shadcn primitives.
- Created feature matrix generator (1,087 features).
