# ShikkhaAI — Frontend

AI-powered education platform for Bangladesh. This is the frontend foundation: routing, layouts,
design system, API client and state management. Feature UIs are added on top of it.

## Tech stack

| Area | Library |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, Cache Components) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4, shadcn/ui (Radix, "nova" style), tw-animate-css |
| Icons | lucide-react |
| Charts | Recharts |
| Animation | Framer Motion |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) |
| Server state | TanStack Query |
| Client state | Zustand |
| Theming | next-themes (light by default, dark ready) |

## Getting started

```bash
npm install
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev                  # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` / `lint:fix` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm run check` | typecheck + lint + build |

## Environment variables

All are public (`NEXT_PUBLIC_*`) and validated with Zod in `src/config/env.ts`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | `ShikkhaAI` | Display name |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Frontend URL (metadata) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend REST API base URL |
| `NEXT_PUBLIC_USE_MOCK_API` | `true` | `true` = mock services, `false` = real API |

## Folder structure

```
src/
├── app/                 Routes only (thin pages → components/features)
│   ├── (marketing)/     Public site: /, /about, /features, /pricing, /contact, /faq
│   ├── (auth)/          /login, /register, /forgot-password, /onboarding
│   ├── student/         Student portal  (layout + 19 sections)
│   ├── teacher/         Teacher portal  (layout + 10 sections)
│   ├── institution/     Institution portal (layout + 12 sections)
│   ├── parent/          Parent portal   (layout + 7 sections)
│   ├── admin/           Admin panel     (layout + 19 sections)
│   ├── layout.tsx       Root layout: fonts, lang="bn", providers
│   ├── globals.css      Design tokens (colors, radius, breakpoints, dark theme)
│   ├── error.tsx / not-found.tsx
├── components/
│   ├── ui/              shadcn/ui primitives (generated — edit sparingly)
│   ├── common/          Logo, PageHeader, DashboardCard, DataTable, SearchBar, FilterPanel, ThemeToggle, placeholders
│   ├── navigation/      Sidebar, MobileSidebar, Header, Breadcrumbs, UserDropdown, NotificationPanel, marketing nav/footer
│   ├── layouts/         MarketingLayout, AuthLayout, PortalLayout + Student/Teacher/Institution/Parent/AdminLayout
│   ├── charts/          ChartCard, AreaTrendChart (token-themed Recharts)
│   ├── forms/           FormField (React Hook Form bound)
│   ├── modals/          ConfirmDialog
│   └── feedback/        EmptyState, ErrorState, LoadingSpinner, PageSkeleton
├── features/            Domain modules (ai-tutor, books, question-bank, examinations, …)
├── hooks/               Shared hooks (auth, notifications, debounce, media query)
├── lib/
│   ├── api/             API client, ApiError, endpoints, query client, query keys
│   ├── validations/     Zod schemas (auth, common)
│   ├── constants/       Routes, role maps, storage keys, motion variants
│   ├── helpers/         Bangla digits, number/currency/date formatting
│   └── utils.ts         `cn()` class merger
├── services/            Data access; each service switches between real API and mock/
├── stores/              Zustand stores (auth session, UI preferences)
├── providers/           Theme, Query, Tooltip, Toaster, AuthBridge
├── config/              env, site, fonts, navigation, auth route rules
├── contexts/            PortalContext (which portal is rendering)
├── types/               Shared TypeScript types (api, user, navigation, common)
├── mock-data/           Sample data for mock services
└── styles/              Typography utilities (text-display, text-h1 … text-caption)
```

## Conventions

- **Routes stay thin.** `app/**/page.tsx` composes components from `features/` and `components/`.
- **Features own their domain.** Each `features/<name>/` grows `components/`, `hooks/`, `services/`,
  `types.ts` and exposes a public API through `index.ts`. Import from `@/features/<name>`.
- **Navigation is config-driven.** `src/config/navigation.ts` is the single source for sidebar links,
  breadcrumb labels and page titles. Adding a portal section = add a nav item + a route folder.
- **Data flow:** component → hook (TanStack Query) → service → `apiClient` (or mock).
  Flip `NEXT_PUBLIC_USE_MOCK_API=false` once the backend is live.
- **Auth-ready:** `AuthBridge` injects the bearer token from the auth store and clears the session on 401.
  `src/config/auth.ts` holds role-based route rules for a future `proxy.ts`.
- **Design tokens** live in `globals.css` as CSS variables; use semantic classes
  (`bg-primary`, `text-muted-foreground`, `text-success`, `rounded-xl`) rather than raw colors.
- **Bangla first:** `lang="bn"`, Inter for Latin + Hind Siliguri for Bengali glyphs, relaxed line-height,
  `toBanglaDigits()` / `formatNumber()` for numerals.
- Add shadcn components with `npx shadcn@latest add <component>`.

## Notes

- Tailwind is wired through Turbopack's `@tailwindcss/turbopack` loader (configured in `next.config.ts`),
  so no `postcss.config.mjs` is needed.
- `cacheComponents` is enabled. Any request-time data (cookies, headers, uncached fetches) must sit
  inside a `<Suspense>` boundary.
