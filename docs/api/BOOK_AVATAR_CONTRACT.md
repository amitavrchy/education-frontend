# Book Avatar Contract

Each book gets its own live 2D teacher avatar. Students ask it by text or voice. It answers **only from that
book**, with page citations, and declines anything outside the book.

- **Current implementation:** `src/services/avatar.service.ts` with `src/services/ai/book-avatar-engine.ts`.
  This is a local mock that keyword-searches the book's pages and tutor scenarios.
- **Types:** `src/contracts/learning.ts` (`BookAvatar`, `AvatarSession`, `AvatarMessage`, `AvatarCitation`,
  `AvatarReport`).
- **Target:** NestJS API, with the FastAPI AI service doing retrieval restricted to `bookId` (plus
  `scopeChapterIds` when set).

Rendering and speech run on the client. The avatar is SVG (`src/components/avatar/teacher-avatar.tsx`) and is
lip-synced from the TTS envelope. Speech uses the Web Speech API (`use-avatar-speech.ts`, `use-voice-io`). The
API only exchanges text, so a server TTS/STT can replace the browser's later without changing the contract.

## Lifecycle

1. The admin uploads a book (`UPLOAD_PIPELINE_CONTRACT.md`).
2. The server creates the book's avatar from defaults (status `draft` until the book is published). This step
   is idempotent.
3. The admin edits the avatar's appearance, voice, persona, greeting and scope, then activates it.
4. Students can see the avatar when the book is `published` and the avatar is `active`.

## Endpoints

| Purpose | Request | Response |
| --- | --- | --- |
| List avatars (admin) | `GET /book-avatars?search=&status=&level=` | `Paginated<BookAvatar>` |
| Avatar for a book | `GET /books/:bookId/avatar` | `BookAvatar` |
| Update avatar | `PUT /book-avatars/:id` | `BookAvatar` (`422 AVATAR_NAME_REQUIRED \| AVATAR_GREETING_REQUIRED`) |
| Test answer (admin/teacher, not stored) | `POST /book-avatars/:id/preview { query }` | `AvatarAnswer` |
| Available to student | `GET /student/book-avatars` | `{ book, avatar }[]` |
| Start session | `POST /avatar-sessions { bookId }` | `{ session, greeting: AvatarMessage }` |
| Sessions | `GET /avatar-sessions` | `AvatarSession[]` |
| Messages | `GET /avatar-sessions/:id/messages` | `AvatarMessage[]` |
| **Ask** | `POST /avatar-sessions/:id/ask { text, inputMode: "text" \| "voice" }` | `{ question, reply }` (streaming optional, same events as the AI tutor) |
| Feedback | `PATCH /avatar-messages/:id { feedback: "up" \| "down" }` | `AvatarMessage` |
| Report answer | `POST /avatar-messages/:id/report { reason }` | `AvatarReport` |
| Reports (admin/teacher) | `GET /avatar-reports?status=&bookId=` | `AvatarReport[]` |
| Resolve report | `PATCH /avatar-reports/:id { status, resolution }` | `AvatarReport` |
| Parent usage (counts only) | `GET /guardian/children/:id/avatar-usage` | `{ sessions, questions, minutes, byBook[] }` |

## `AvatarAnswer`

```ts
interface AvatarAnswer {
  text: string;                                   // Markdown + LaTeX, rendered in chat
  spoken: string;                                 // plain speakable text for TTS (no markup/URLs)
  citations: AvatarCitation[];                    // { page, chapterTitle, heading?, excerpt }
  grounded: "book" | "greeting" | "out_of_scope";
  followUps: string[];
}
```

## Server rules

- **Book scope:** retrieve only from the book's chunks. When `strictBookScope` is on and nothing relevant is
  found, return `grounded: "out_of_scope"` with no citations and suggest topics from the book.
- **Language:** reply in the language of the question. When it can't be detected, fall back to
  `avatar.voice.language`.
- **Persona:** `style` and `answerLength` shape the answer. `useExamples` adds a worked example.
- **Errors:** `ask` requires the network (no offline answers). Apply the same rate limits and abuse moderation
  as the AI tutor.
- **Privacy:** guardians see counts only, never message text. Audit admin edits and report resolutions.
- **Stats:** keep `sessions`, `questions`, `outOfScope`, `helpful` and `notHelpful` on the avatar, aggregated
  server-side.
