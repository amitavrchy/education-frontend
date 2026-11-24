# Frontend Architecture

## Stack

Next.js 16 (App Router, `cacheComponents`) · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui on Radix ·
TanStack Query · TanStack Table/Virtual · Zustand · React Hook Form + Zod · Recharts · KaTeX
(react-markdown + remark-math) · PDF.js · Tiptap · Framer Motion · Lucide · Vitest · Playwright.

> Next 16 has breaking changes versus older Next.js. Read `node_modules/next/dist/docs/` before changing
> routing, caching or config (see `AGENTS.md`).

## Layers

```
src/app/**            Routes only: metadata + <Suspense> + one feature component. No data access.
src/components/**     Presentation + interaction, grouped by portal/feature (student/, admin/, teacher/…).
src/hooks/**          Reusable query/mutation hooks (curriculum, progress, planner, notifications, offline, auth).
src/services/**       Application logic + repositories. The ONLY layer that knows where data comes from.
src/services/core/    Repository factory (mock IndexedDB ↔ REST), mock runtime (latency/failure/offline).
src/contracts/**      Typed domain models shared by services and UI (platform-neutral shapes).
src/mock-data/**      Deterministic seed data (synthetic, labelled).
src/lib/mock-db       IndexedDB store with in-memory fallback; versioned seeds.
src/lib/auth          Roles, permissions, portal mapping.
src/i18n/**           Bangla/English dictionaries, `useT`, `useL(bn, en)`, `useFormat` (digits, dates, currency).
src/stores/**         Zustand: auth session, preferences (locale/theme/a11y/dashboard layout), UI.
src/config/**         Site/brand, env (Zod-validated), navigation.
```

Rules:

1. UI never imports `src/mock-data` or `src/lib/mock-db` directly; it goes through `src/services`.
2. Mock-only behaviour (simulated OCR, AI, payment outcomes) lives in services and is labelled in the UI.
3. Every admin mutation writes an audit entry (`audit()` in `admin.service.ts`).

## Rendering model

Mock data lives in the browser (IndexedDB), so data fetching is client-side with TanStack Query. Route files
are server components that render a skeleton fallback inside `<Suspense>`. Dynamic params are awaited inside
the Suspense boundary. Render must be pure: use `useNow()` (`src/hooks/use-now.ts`) instead of `Date.now()`
during render.

## Portals

`src/components/shell/portal-shell.tsx` provides layout, auth/role checks and per-page permission checks for
each portal. It shows access-denied, skeleton, offline banner and demo banner states. Navigation comes from
config, so a new page needs only a nav entry, a route file and a component.

## Cross-cutting

- **Search**: `services/search-registry.ts` — modules register providers; the ⌘K palette and `/student/search`
  query them all.
- **Notifications**: `notification.service.ts`, shared `NotificationCenter` for every portal.
- **Offline**: `offline.service.ts` (downloads, storage, sync conflicts); service worker registers in production.
- **Errors**: `ApiError` + `errorText()` give localised messages; shared `ErrorState`, `EmptyState`, `QueryState`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on port 3001 |
| `npm run typecheck` | Route typegen + `tsc --noEmit` |
| `npm run lint` | ESLint (React Compiler rules) |
| `npm test` | Vitest unit/component tests |
| `npm run test:e2e` | Playwright journeys (reuses the dev server) |
| `npm run build` | Production build |
| `npm run check` | typecheck + lint + test + build |
| `npm run docs` | Regenerate feature matrix + screen inventory |
