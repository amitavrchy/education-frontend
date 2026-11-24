# User Journeys

Each journey lists its route path and how it is verified. **e2e** means it is covered by
`tests/e2e/*.spec.ts`; **smoke** means it was exercised in a browser during development.

## Student

| # | Journey | Path | Verified |
| --- | --- | --- | --- |
| 1 | Sign up → OTP → guardian consent (or later) → 7-step onboarding → dashboard | `/register` → `/verify-otp` → `/consent/guardian` → `/onboarding` | e2e |
| 2 | Pick subject → chapter → topic, mark complete | `/student/curriculum/[subject]/[chapter]` | smoke |
| 3 | Ask the AI tutor; see grounding label, citation, open source viewer | `/student/ai-tutor` | e2e |
| 4 | Start and end a voice session; save transcript to notes | `/student/voice-tutor` | smoke |
| 5 | Upload a question photo → simulated OCR → correct text → solution | `/student/photo-solver` | smoke |
| 6 | Practise MCQs, bookmark, add to a practice set | `/student/questions`, `/student/practice` | e2e (bookmark) |
| 7 | Take an exam → submit → scored result → analytics update | `/student/exams` → `/student/exams/take/[id]` → `/student/exams/results/[id]` | e2e + unit (mastery) |
| 8 | Receive revision recommendation, add it to the study plan | result page → `/student/study-planner` | smoke |
| 9 | Create a study plan, drag tasks to reschedule | `/student/study-planner` | smoke |
| 10 | Create and review flashcards (SM-2) | `/student/flashcards` | unit (scheduler) + smoke |
| 11 | Save and edit notes (autosave, history) | `/student/notes` | smoke |
| 12 | Open a board paper, practise it timed | `/student/board-questions/[paperId]` | smoke |
| 13 | Read a textbook (PDF.js), bookmark a page, ask AI about the page | `/student/library/[bookId]` | smoke |
| 14 | Use a science simulation | `/student/labs` | smoke |
| 15 | Change language and theme (persisted) | header toggles | e2e |
| 16 | Go offline: downloads available, AI tutor paused | `/student/offline` | e2e |

## Guardian, teacher, institution

| # | Journey | Path | Verified |
| --- | --- | --- | --- |
| 17 | Guardian links a child, views authorised progress; AI chats private | `/parent/*` | e2e |
| 18 | Reviewer approves content → content manager publishes | `/teacher/review` → `/admin/content-review` | e2e |
| 19 | Teacher creates a question (goes to review) | `/teacher/questions` | smoke |
| 20 | Institution creates and schedules an exam | `/institution/exams` | e2e (opens form) + smoke |

## Admin

| # | Journey | Path | Verified |
| --- | --- | --- | --- |
| 21 | Upload a book PDF → 11-stage ingestion → approve review → published | `/admin/books` | e2e |
| 22 | Upload a board paper → OCR preview → split → map chapters → save as draft | `/admin/board-questions` | smoke |
| 23 | Bulk-import questions (CSV parsed; other formats simulated) with duplicate detection | `/admin/questions` | e2e |
| 24 | Create an exam with the wizard, publish → appears for students | `/admin/exams` | e2e |
| 25 | Change a subscription plan; entitlements update | `/admin/subscriptions` | e2e + unit |
| 26 | Checkout simulator: success / failed / pending | `/admin/subscriptions` | e2e + unit |
| 27 | Moderate a report, resolve with a note (audited) | `/admin/moderation` | smoke |
| 28 | Edit prompt template, compare versions, roll back | `/admin/knowledge-base` | smoke |
| 29 | Access restrictions per role | any | e2e + unit |
| 30 | Empty / error / loading states | DataTable and shared states | unit + smoke |
