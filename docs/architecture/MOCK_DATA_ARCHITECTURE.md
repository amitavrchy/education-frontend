# Mock Data Architecture

## Storage

`src/lib/mock-db` keeps one IndexedDB object store (`shikkhaai-mock-db`). Each collection is one record keyed by
name. Collections are seeded lazily from deterministic seed functions on first access. If IndexedDB is
unavailable (SSR, some private windows) it falls back to memory.

`MOCK_SEED_VERSION` is bumped whenever seed shapes change. Stored data with an older version is discarded and
reseeded.

**Reset:** Settings → *Reset demo data* in any portal (calls `resetMockDb()`), or clear site data in the browser.

## Repositories

`createMockRepository<T>({ collection, seed, searchFields, defaultSort, latency, timestamps, apiPath })`
returns the `Repository<T>` interface:
`list` (search/filter/sort/paginate), `all`, `get`, `find`, `create`, `update`, `remove`, `bulkUpdate`,
`bulkRemove`, plus `raw()` / `replaceAll()` for service-level composition. Per-student data uses factories,
for example `examAttemptsRepo(studentId)`, which maps to collection `examAttempts:<id>`.

There are about 80 repositories across `src/services/*.service.ts`.

## Seed data

`src/mock-data/*` contains synthetic but internally consistent records: 10 demo accounts plus generated users,
2 linked children, multiple institutions, SSC/HSC curriculum (levels → outcomes), around 1,700 questions across 15
types with answers and explanations, sample book metadata and source passages, 9 boards × 10 years of
**synthetic** board papers (HSC 2020 omitted because no exam was held), institution papers with SVG scans, exams
and templates, attempts, plans, flashcards, notes, conversations, voice transcripts, badges, plans/payments/coupons,
ingestion jobs, review queues, notifications, audit logs and analytics series.

Rules:

- Synthetic content is labelled. It is never presented as real board questions or verified textbook citations.
- Financial and analytics numbers are labelled as mock/demo.
- No real personal data. Institution codes are not real EIINs.

## Simulated subsystems

| Subsystem | Implementation |
| --- | --- |
| AI tutor | `services/ai/tutor-engine.ts`: keyword RAG over seeded passages + scenario responses per subject and mode, confidence/grounding, warnings |
| Voice | `services/voice.service.ts`: `VoiceAdapter` mock; uses device speech recognition/synthesis when available |
| OCR | `services/ocr.service.ts`: deterministic fixtures, including invalid/unreadable cases |
| Handwriting evaluation | `services/evaluation.service.ts`: rubric scoring with AI-estimate / teacher / official stages |
| Ingestion | `ingestionService.step()` advances 11 stages; supports failure, retry, review gate, reindex |
| Payments | `billingService.checkout()`: card `…0002` fails, wallet `…9` pending, else success |
| Duplicate detection | Jaccard token similarity (`admin-shared.tsx`) |
