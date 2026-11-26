# API Contracts

Typed domain models live in `src/contracts/*.ts` and are the contract the backend should satisfy. The generic
REST conventions (pagination, filtering, errors, bulk operations) are in
[`../architecture/BACKEND_INTEGRATION_PLAN.md`](../architecture/BACKEND_INTEGRATION_PLAN.md).

## Common

- Envelope: `{ data: T }`; lists `{ data: T[], meta: { total, page, pageSize, totalPages } }`.
- Auth: `Authorization: Bearer <access token>` (target: httpOnly cookie + refresh at `POST /auth/refresh`).
- Timestamps are ISO-8601 strings. Bilingual fields are `{ bn, en }`.
- Errors: HTTP status + `{ message, code, errors? }`. Codes used by the UI: `VALIDATION`, `NOT_FOUND`,
  `FORBIDDEN`, `OFFLINE`, `OTP_INVALID`, `WRONG_PASSWORD`, `COUPON_INVALID`, `COUPON_NOT_APPLICABLE`,
  `COUPON_EXHAUSTED`, `REFUND_EXISTS`, `NO_SUBSCRIPTION`, `NO_QUESTIONS`.
- Every record that is synthetic or user-generated carries `provenance`
  (`synthetic_sample | licensed_sample | teacher_uploaded | institution_uploaded | user_generated`).

## Domains → contract types → default paths

| Domain | Types (`src/contracts`) | Default REST path(s) |
| --- | --- | --- |
| Auth | `User`, `AuthSession` (`src/types/user.ts`) | `/auth/login`, `/auth/register`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/forgot-password` |
| Users | `UserAccount` | `/users` |
| Academic profile | `StudentProfile` | `/student-profiles` |
| Curriculum | `EducationLevel`, `CurriculumVersion`, `AcademicYear`, `ExamYear`, `Board`, `Group`, `ClassLevel`, `Subject`, `Paper`, `Chapter`, `Topic`, `LearningOutcome`, migrations, updates | `/curriculum/{levels,versions,boards,subjects,chapters,topics,outcomes,…}` |
| Textbooks | `Book`, reading state, highlights, page notes | `/books`, `/books/:id/reading-state` |
| Question bank | `Question`, `ContentReport`, `Bookmark`, `PracticeSet`, `QuestionAttempt` | `/questions`, `/content-reports`, `/bookmarks/:studentId`, `/practice-sets/:studentId` |
| Board exams | `BoardPaper` (+ `authenticity`) | `/board-papers` |
| Institution papers | `InstitutionPaper` | `/institution-papers` |
| Tutor | `Conversation`, `ChatMessage`, `Citation`, `TutorContext` | see `AI_TUTOR_CONTRACT.md` |
| Knowledge base | `SourcePassage`, `KbCollection`, `PromptTemplate`, `AiSettings`, `AiLogEntry`, `EvalDataset` | `/kb-passages`, `/kb-collections`, `/prompt-templates`, `/ai-settings`, `/ai-logs`, `/eval-datasets` |
| Voice | `VoiceSession`, `VoiceTurn`, `VoiceQuota` | see `VOICE_SESSION_CONTRACT.md` |
| OCR / photo solver | `OcrJob` | `/ocr-jobs` (see `UPLOAD_PIPELINE_CONTRACT.md`) |
| Exams | `Exam`, `ExamTemplate`, `ExamAttempt`, `ExamResult`, `QuestionResult` | `/exams`, `/exam-templates`, `/exam-attempts/:studentId` |
| Handwriting | `HandwritingEvaluation`, `EvaluationPage` (stage: `ai_estimated → teacher_reviewed → official`) | `/evaluations/:studentId` |
| Study plans | `StudyTask`, planner settings, goals | `/study-tasks/:studentId` |
| Adaptive / progress | `TopicMastery`, `ChapterProgress`, `ActivityEntry`, `GamificationState` | `/progress/:studentId/*` |
| Notes / flashcards | `Note`, `Flashcard`, `FlashcardDeck` | `/notes/:studentId`, `/flashcards/:studentId` |
| Notifications | `Notification`, `Notice` | `/notifications` |
| Schools (directory + teacher classes) | `Institution` (archive directory, student affiliation), `ClassGroup`, `Assignment`, `Submission` | `/institutions` (read-only), `/classes`, `/assignments`, … |
| Teachers | `TeacherProfile`, `TeacherFeedback`, `ReviewItem`, `Rubric` | `/teacher-profiles`, `/review-items`, `/rubrics` |
| Parents | `GuardianLink` (permission flags; `aiConversations` defaults false) | `/guardian-links` |
| Billing | `Plan`, `Subscription`, `Payment`, `Coupon`, `RefundRequest`, `UsageMeter` | `/plans`, `/subscriptions`, `/payments`, `/coupons`, `/refunds` |
| Admin ops | `IngestionJob`, `AuditLog`, `ModerationCase`, `PrivacyRequest`, `SecurityAlert`, `SessionRecord`, `ApiKeySetting`, `SystemConfig` | `/ingestion-jobs`, `/audit-logs`, `/moderation-cases`, … |
| Analytics | series shapes in `analyticsSeries()` | `/analytics/*?from=&to=` |
| Files | upload lifecycle | see `UPLOAD_PIPELINE_CONTRACT.md` |

## Server-side rules the backend must own

- Exam scoring (`scoreAttempt`), negative marking, time limits and result publication policy.
- Content status transitions (`CONTENT_TRANSITIONS` + role checks in `allowedTransitions`).
- Plan entitlements and quotas (`PlanLimits`, `UsageMeter`).
- Guardian visibility (`GuardianLink.permissions`). No guardian consent step: students of any age sign up on their own.
- Audit logging of every admin mutation.
