# Backend Integration Plan

Target backends: NestJS API (PostgreSQL/Prisma, Redis, object storage) and a Python FastAPI AI service
(RAG over a vector DB, realtime voice, OCR), plus payment and notification providers.

## The switch

Set `NEXT_PUBLIC_USE_MOCK_API=false` and `NEXT_PUBLIC_API_URL=<api base>`.

`createMockRepository()` then returns `createApiRepository(apiPath)` for **every** repository, with the same
`Repository<T>` interface. Services and UI components do not change. The default `apiPath` is the collection
name in kebab case (`examAttempts:u-1` → `/exam-attempts/u-1`); override it per repository with the `apiPath`
option.

REST conventions expected by the adapter (`src/services/core/repository.ts`):

| Operation | HTTP |
| --- | --- |
| list | `GET /path?page=&pageSize=&search=&sortBy=&sortOrder=&filter[key]=v1,v2` → `{ data: T[], meta: { total, page, pageSize, totalPages } }` |
| all | `GET /path?all=true&filter[...]` → `{ data: T[] }` |
| get / find | `GET /path/:id` → `{ data: T }` |
| create | `POST /path` → `{ data: T }` |
| update | `PATCH /path/:id` → `{ data: T }` |
| remove | `DELETE /path/:id` |
| bulkUpdate | `PATCH /path/bulk { ids, patch }` |
| bulkRemove | `POST /path/bulk-delete { ids }` |

Errors: `{ message, code, errors?: Record<field, string[]> }` with HTTP status. `ApiError` maps them, and
`errorText()` localises known codes (`VALIDATION`, `NOT_FOUND`, `FORBIDDEN`, `OFFLINE`, domain codes such as
`COUPON_INVALID`, `OTP_INVALID`).

## What still needs backend work (not just a URL)

1. **Composite domain operations** that services implement over several collections in the mock. These should
   become dedicated endpoints. `replaceAll()` throws in API mode to surface them:
   - `progressService.recordAttempts` (attempts + mastery + XP + badges) → `POST /progress/attempts`
   - `tutorService.send/regenerate` → streaming endpoint (see `docs/api/AI_TUTOR_CONTRACT.md`)
   - `examService.start/submit` (scoring must be server-side) → `POST /exams/:id/attempts`, `POST /attempts/:id/submit`
   - `billingService.checkout` → payment-intent flow with provider webhooks
   - `ingestionService.*` → job API + websocket/SSE progress (see `UPLOAD_PIPELINE_CONTRACT.md`)
   - `reviewService.transition` → server-enforced state machine
2. **Auth**: move tokens to httpOnly cookies; `auth.service.ts` already isolates login/OTP/refresh calls
   (`src/lib/api/endpoints.ts`).
3. **Authorisation**: re-implement `ROLE_PERMISSIONS` checks server-side. Client guards are UX only.
4. **Uploads**: presigned object-storage URLs; the client already tracks progress, cancel and retry.
5. **Realtime**: voice (WebRTC/WebSocket), notifications (SSE/WebSocket), ingestion progress.
6. **Search**: replace in-memory providers in `search-registry.ts` with a search endpoint.

## Status (API mode wired, 2026-11-26)

Run the backend (`education-backend`, demo mode) and set `NEXT_PUBLIC_USE_MOCK_API=false`,
`NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` in `.env.local`.

- Generic repositories → REST (unchanged). In API mode `replaceAll(items)` is `PUT /<path>/<studentId> {items}`
  (owner study data only; the server rejects it for server-owned collections).
- `getDocument/saveDocument` → `GET|PUT /documents/:key` for server documents (`systemConfig`, `permissionMatrix`,
  `aiSettings`, `gamification:`, `usage:`, `planSettings:`, `english:`, `guardianGoals:`); other documents stay on the device.
- Auth: real `/auth/*` with OTP `challengeId`, refresh token stored and rotated automatically on a 401.
- Composite operations call dedicated endpoints through `services/core/remote.ts`: progress, exams (incl. the
  runner's answer-key-free questions), tutor, billing, usage, review, guardian, notifications read-all, search,
  assignment distribution (`POST /submissions/batch`).
- Book avatar: avatars and reports through the generic `/book-avatars`, `/avatar-reports`; sessions, answers
  (from the book, on the server), feedback, reports, guardian usage and the staff preview through `/avatar/*`.
- AI (education-ai, Gemini) through the backend: photo solver (`/ocr/:sid/solve`, `/ocr/:sid/:jobId/solve`),
  answer-script transcription and marking (`/evaluations/:sid/:id/evaluate`), voice tutor and oral exam
  (`/voice/:sid/reply`; speech-to-text and TTS stay on the device), audio lessons (`/audio-lessons/generate`),
  chapter flashcards (`/flashcards/:sid/generate`), notes (`/notes/:sid/generate`), English writing feedback
  (`/english/:sid/writing`) and the KB query simulator (`/kb/query`). Quotas are counted on the server.
- Manual payments: checkout shows the bKash/Nagad/Rocket/Upay numbers from `/billing/payment-settings`; the
  student submits their number and the transaction id; admins verify under Subscriptions → Verify payments and
  edit the numbers under Payment numbers.
- Staff lists across students: `/staff/evaluations` (teacher queue), `/staff/exam-attempts` (exam results).
  Notifications for other people are sent by the server; the client only adds its own reminders.
- API mode is the default (`NEXT_PUBLIC_USE_MOCK_API=false`); the in-browser mock layer is kept for unit tests.

## Suggested order

Auth → curriculum (read) → questions/bank → exams + scoring → progress → tutor streaming → notifications →
admin content ops + ingestion → billing → voice.

Detailed shapes: [`../api/API_CONTRACTS.md`](../api/API_CONTRACTS.md) and the other contracts in `docs/api/`.
