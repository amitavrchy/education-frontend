# ShikkhaAI — Frontend (Next.js)

AI-powered learning platform for SSC and HSC students in Bangladesh. This repository is the **complete web
frontend**: public website, student app, parent, teacher/reviewer and school/college portals, and the admin
dashboard. Everything runs on typed mock services, so no backend is needed. The Flutter student app is a
separate repository (`education-flutter`).

> Frontend-only build: AI answers, voice, OCR, payments and notifications are **simulated and labelled**. All
> academic content is synthetic. See [`docs/testing/KNOWN_LIMITATIONS.md`](docs/testing/KNOWN_LIMITATIONS.md).

## Quick start

```bash
npm install
cp .env.example .env.local        # keep NEXT_PUBLIC_USE_MOCK_API=true
npm run pdf:samples               # optional: generate sample textbook PDFs for the library
npm run dev                       # http://localhost:3001
```

Port 3001 is used because 3000 belongs to another project on the original machine.

## Demo accounts

Any password works (`wrongpass` simulates a wrong-password error). OTP is always **123456**.

| Role | Email | Lands on |
| --- | --- | --- |
| Student | `student@shikkha.ai` | `/student/dashboard` |
| Parent / guardian | `parent@shikkha.ai` | `/parent/dashboard` |
| Teacher | `teacher@shikkha.ai` | `/teacher/dashboard` |
| Content reviewer | `reviewer@shikkha.ai` | `/teacher/dashboard` |
| Content manager | `content@shikkha.ai` | `/admin/dashboard` |
| School admin | `school@shikkha.ai` | `/institution/dashboard` |
| College admin | `college@shikkha.ai` | `/institution/dashboard` |
| Customer support | `support@shikkha.ai` | `/admin/dashboard` |
| Platform admin | `admin@shikkha.ai` | `/admin/dashboard` |
| Super admin | `super@shikkha.ai` | `/admin/dashboard` |

The user menu also has a **demo role switcher**. It is for development only and is not a security feature.
Role details: [`docs/product/USER_ROLES.md`](docs/product/USER_ROLES.md).

## Reset sample data

Data persists in IndexedDB in your browser. To start over, use **Settings → Reset demo data** (any portal) or
clear the site's storage in browser dev tools.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `start` | Dev server / production server on port 3001 |
| `npm run build` | Production build |
| `npm run typecheck` | Route typegen + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit + component tests |
| `npm run test:e2e` | Playwright journeys (starts or reuses the dev server). First time: `npx playwright install chromium` |
| `npm run check` | typecheck + lint + test + build |
| `npm run docs` | Regenerate `FEATURE_MATRIX.md` and `SCREEN_INVENTORY.md` |
| `npm run pdf:samples` | Generate sample PDFs used by the textbook library |

## Environment

All variables are public and validated in `src/config/env.ts`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | `ShikkhaAI` | Product name (rebrands the UI) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Frontend URL for metadata |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend base URL |
| `NEXT_PUBLIC_USE_MOCK_API` | `true` | `false` switches **every** repository to its REST adapter |

## Project layout

```
src/
├── app/            Routes only — (marketing), (auth), student, parent, teacher, institution, admin
├── components/     UI by portal/feature + shared shell, data table, charts, feedback states, ui primitives
├── services/       Application logic + repositories (mock IndexedDB ⇄ REST switch in services/core)
├── contracts/      Typed domain models (the API contract)
├── mock-data/      Deterministic synthetic seed data
├── hooks/ stores/  TanStack Query hooks, Zustand stores (auth, preferences, UI)
├── i18n/           Bangla + English dictionaries and formatters
└── config/ lib/    Brand, env, navigation, permissions, mock DB, API client
tests/unit · tests/e2e · docs/
```

## Documentation

| Area | Docs |
| --- | --- |
| Product | [Overview](docs/product/PRODUCT_OVERVIEW.md) · [Feature matrix](docs/product/FEATURE_MATRIX.md) · [Roles](docs/product/USER_ROLES.md) · [Journeys](docs/product/USER_JOURNEYS.md) · [IA](docs/product/INFORMATION_ARCHITECTURE.md) · [Screens](docs/product/SCREEN_INVENTORY.md) |
| Architecture | [Frontend](docs/architecture/FRONTEND_ARCHITECTURE.md) · [State](docs/architecture/STATE_MANAGEMENT.md) · [Mock data](docs/architecture/MOCK_DATA_ARCHITECTURE.md) · [Backend integration](docs/architecture/BACKEND_INTEGRATION_PLAN.md) · [Flutter](docs/architecture/FLUTTER_ARCHITECTURE.md) |
| Design system | [Tokens](docs/design-system/DESIGN_TOKENS.md) · [Components](docs/design-system/COMPONENT_LIBRARY.md) · [Accessibility](docs/design-system/ACCESSIBILITY.md) |
| API | [Contracts](docs/api/API_CONTRACTS.md) · [AI tutor](docs/api/AI_TUTOR_CONTRACT.md) · [Voice](docs/api/VOICE_SESSION_CONTRACT.md) · [Uploads](docs/api/UPLOAD_PIPELINE_CONTRACT.md) |
| Testing | [Strategy](docs/testing/TEST_STRATEGY.md) · [QA checklist](docs/testing/QA_CHECKLIST.md) · [Acceptance report](docs/testing/FEATURE_ACCEPTANCE_REPORT.md) · [Known limitations](docs/testing/KNOWN_LIMITATIONS.md) |

The original requirements are in [`docs/MASTER_PROMPT.md`](docs/MASTER_PROMPT.md). Session-by-session handoff
notes are in [`PROGRESS.md`](PROGRESS.md).
