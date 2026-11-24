# AI Tutor Contract

Current implementation: `src/services/tutor.service.ts` + `src/services/ai/tutor-engine.ts` (local mock engine).
Target: FastAPI AI service behind the NestJS API.

## Context

```ts
interface TutorContext {
  levelCode: "SSC" | "HSC"; grade: number;
  subjectId?: string; paperId?: string; chapterId?: string; topicId?: string;
  curriculumVersionId: string;            // retrieval prefers this version, warns on older ones
  language: "bn" | "en" | "mixed";
  mode: "simple" | "socratic" | "board" | "revision" | "stepwise" | "deep" | "practice" | "oral" | "formula" | "english";
}
```

## Endpoints

| Purpose | Request | Response |
| --- | --- | --- |
| Create conversation | `POST /tutor/conversations { context }` | `Conversation` |
| List / search | `GET /tutor/conversations?search=&folderId=&archived=` | `Conversation[]` |
| Update (rename, pin, archive, folder, share) | `PATCH /tutor/conversations/:id` | `Conversation` |
| Messages | `GET /tutor/conversations/:id/messages` | `ChatMessage[]` |
| **Send (streaming)** | `POST /tutor/conversations/:id/messages { content, replaceFromMessageId? }` → `text/event-stream` | events below |
| Regenerate | `POST /tutor/messages/:id/regenerate` (stream) | events below |
| Feedback / report / teacher review | `PATCH /tutor/messages/:id { feedback \| reported \| teacherReviewRequested }` | `ChatMessage` |
| Convert | `POST /tutor/conversations/:id/convert { to: "notes" \| "quiz" \| "flashcards" }` | created resource ids |
| Export | `GET /tutor/conversations/:id/export?format=md\|pdf` | file |

### Stream events (SSE)

```
event: meta      data: { messageId, mode, grounding, confidence, warnings[] }
event: citation  data: Citation            // may arrive before or during tokens
event: delta     data: { text }            // append to content
event: followups data: { followUps[], relatedQuestionIds[] }
event: done      data: { messageId, usage: { inputTokens, outputTokens } }
event: error     data: { code, message }   // e.g. QUOTA_EXCEEDED, SAFETY_BLOCKED, UPSTREAM_TIMEOUT
```

## Answer semantics the UI depends on

- `grounding`: `verified` (cited, verified sources) · `partial` · `general` (no source found, label shown) ·
  `unavailable` (KB missing for the chapter).
- `confidence` 0–1. Below the policy threshold (`AiSettings.policy.minConfidenceToAnswer`) the UI shows the
  low-confidence state.
- `warnings`: `low_confidence | missing_kb | conflicting_sources | old_curriculum | integrity | safety`.
- `Citation`: `{ passageId, bookTitle, chapterTitle, page, excerpt, highlight, curriculumVersionId, verification, score }`.
  `highlight` must be a substring of `excerpt` (it is highlighted in the source viewer).
- `simulated: true` is shown as "Simulated AI" in this build. The backend sets `false`.
- Never fabricate citations: a citation must refer to an ingested passage id.

## Retrieval (current mock)

Keyword + token overlap scoring with boosts for topic (+5), chapter (+4) and subject (+2), and −2 for a
different curriculum version. Top 4 passages are kept. The admin query simulator
(`/admin/knowledge-base` → Query simulator) uses the same retriever.
