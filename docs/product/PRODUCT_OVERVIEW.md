# Product Overview — ShikkhaAI (working name)

> Vision: *"Every SSC and HSC student deserves an intelligent, personalized, accessible, and affordable private tutor."*

ShikkhaAI is an AI-powered learning platform for Bangladeshi students in classes 9–12 preparing for SSC and HSC
(science, business studies, humanities; Bangla and English versions; general education boards).

The master spec calls the product "EduMentor AI"; this repo keeps the name it already had, **ShikkhaAI**. The name,
logo and colours are centralised (`src/config/site.ts`, `NEXT_PUBLIC_APP_NAME`, design tokens), so renaming is a
config change.

## What this repository contains

| Surface | Base route | Audience |
| --- | --- | --- |
| Public website | `/` | Prospective students, parents, teachers |
| Auth & onboarding | `/login`, `/register`, `/onboarding`, … | Everyone |
| Student web app | `/student/*` | Students |
| Parent / guardian portal | `/parent/*` | Guardians |
| Teacher & content-reviewer portal | `/teacher/*` | Teachers, content reviewers |
| Admin dashboard | `/admin/*` | Content manager, support, platform admin, super admin |

The Flutter student app is a **separate repository** (`education-flutter`); see
[`../architecture/FLUTTER_ARCHITECTURE.md`](../architecture/FLUTTER_ARCHITECTURE.md).

## Product pillars → where they live

| Pillar | Main screens |
| --- | --- |
| AI private tutoring | `/student/ai-tutor` (10 teaching modes, mock RAG with citations) |
| Voice learning | `/student/voice-tutor` |
| Curriculum knowledge | `/student/curriculum`, `/student/library` |
| Question banking | `/student/questions`, `/student/practice` |
| Board exam preparation | `/student/board-questions` (synthetic, clearly labelled) |
| School/college archives | `/student/institution-questions` |
| Study planning | `/student/study-planner` |
| Adaptive learning | `/student/analytics` |
| Exams & evaluation | `/student/exams`, `/student/answer-evaluation` |
| Analytics | student analytics, parent progress, teacher/admin analytics |
| Parent & teacher collaboration | `/parent/*`, `/teacher/*` |
| Content management | `/admin/*` (curriculum, books + ingestion, questions, board/institution papers, AI knowledge base) |

## Frontend-only, mock-backed

There is no backend in this phase. Every journey runs against typed repositories backed by IndexedDB and
deterministic seed data. AI answers, voice replies, OCR, payments and notifications are **simulated and labelled
as such** in the UI. Setting `NEXT_PUBLIC_USE_MOCK_API=false` swaps every repository to a REST adapter with the same
interface (see [`BACKEND_INTEGRATION_PLAN.md`](../architecture/BACKEND_INTEGRATION_PLAN.md)).

## Status

See [`FEATURE_MATRIX.md`](FEATURE_MATRIX.md) (1,087 tracked features) and
[`../testing/FEATURE_ACCEPTANCE_REPORT.md`](../testing/FEATURE_ACCEPTANCE_REPORT.md).
