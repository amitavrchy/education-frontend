# Upload & Processing Pipeline Contract

Covers book PDFs, board/institution question papers, question imports, photo-solver images, handwritten answer
sheets and avatars.

## Client behaviour (implemented)

Real file selection with extension, size and empty-file validation. Simulated upload progress, cancel and retry
(`FileDrop` in `components/admin/admin-shared.tsx`; the student flows have their own pickers). Previews for
images and PDFs. Nothing leaves the browser in this build.

## Target upload lifecycle

1. `POST /uploads { fileName, contentType, sizeBytes, purpose }` →
   `{ uploadId, url, fields, expiresAt }` (presigned object-storage POST).
   `purpose`: `book | board_paper | institution_paper | question_import | photo_question | answer_sheet | avatar`.
2. Client uploads directly to storage, reporting progress. Cancel aborts the request. Retry repeats step 2
   with the same `uploadId` until it expires.
3. `POST /uploads/:id/complete { checksum }` → creates the processing job for the purpose.
4. Progress arrives over SSE `GET /jobs/:id/events` (or polling `GET /jobs/:id`).

Limits come from `SystemConfig.maxUploadMb` (admin → Security → System).

## Book ingestion job (`IngestionJob`)

Stages, in order (`INGESTION_STAGES`):

`upload → validate → extract → ocr → map_chapters → chunk → embed → index → quality_check → review → publish`

```ts
{
  id, bookId, fileName, fileSizeKb,
  stage, stageStatus: "pending" | "running" | "succeeded" | "failed" | "waiting_review",
  progress /* 0–100 */,
  stages: [{ stage, status, startedAt?, finishedAt?, message? }],
  logs: [{ at, level: "info" | "warn" | "error", message }],
  chunkCount, pagesProcessed
}
```

Actions: `POST /ingestion-jobs/:id/retry` (failed stage), `POST /ingestion-jobs/:id/approve-review`
(reviewer gate), `POST /ingestion-jobs/:id/reindex` (restart from `chunk`). Events: `job.stage`, `job.log`,
`job.progress`, `job.done`, `job.failed`.

## Question extraction (papers and imports)

`POST /question-imports { uploadId, subjectId, format }` → job → `GET /question-imports/:id` returns
`{ items: [{ stem, type, marks, difficulty, answer?, chapterId?, duplicateOf?: { questionId, score } }] }`.
The admin confirms the selection, and `POST /question-imports/:id/commit { items }` creates **draft**
questions. Imported or uploaded board papers are always created as `authenticity.status = "unverified"`
until a person verifies the source.

## OCR (photo solver, answer sheets)

`POST /ocr-jobs { uploadId, kind: "question" | "answer_sheet", pages[] }` →
`{ text, confidence, detectedSubjectId?, errors?: ["UNREADABLE" | "UNSUPPORTED_FORMAT" | "INVALID_IMAGE"] }`.
The UI always lets the user correct extracted text before solving or evaluating.
