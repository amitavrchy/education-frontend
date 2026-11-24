# Information Architecture

## Portals and navigation

Navigation is data-driven from `src/config/navigation.ts`. Each item has a slug, an i18n title key, an icon
and an optional permission. The same config drives the sidebar, mobile drawer, bottom nav, command palette and
route guard.

```
Public site (/)
├── Features · Pricing · For parents · For teachers · For schools · For colleges
├── FAQ · About · Contact · Help · Terms · Privacy · Accessibility
└── Login / Register

Auth: welcome · login · register · verify-otp · forgot/reset password · consent · onboarding · session-expired

Student (/student)
├── Dashboard
├── Learn: AI tutor · Voice tutor · Photo solver · Curriculum · Library · Labs · English coach · Audio
├── Practice & exams: Question bank · Practice · Board questions · Institution questions · Exams · Results · Answer evaluation
├── Organise: Study planner · Notes · Flashcards · Bookmarks · Offline
├── Progress: Analytics (adaptive) · Achievements
└── Account: Notifications · Subscription · Help · Settings · Search (⌘K)

Parent (/parent)
└── Dashboard · Children · Progress · Results · Calendar · Feedback · Goals · Reports · Privacy · Subscription · Notifications · Settings

Teacher (/teacher)
├── Review: Review queue · Questions · Rubrics · Evaluations · History
└── Teaching: Subjects · Exams · Assignments · Submissions · Students · Analytics

Admin (/admin)
├── Dashboard · Analytics
├── Content: Curriculum · Books · Questions · Board questions · Institution questions · Exams · Content review · Coverage
├── AI: Knowledge base · Book avatars
├── People: Users · Teachers
├── Business: Subscriptions & billing
└── System: Moderation · Security & audit · Notifications · Settings
```

The full route list is in [`SCREEN_INVENTORY.md`](SCREEN_INVENTORY.md) (generated).

## Cross-module data flows

| Action | Effect elsewhere |
| --- | --- |
| Exam submitted | Attempts → topic mastery (adaptive analytics), XP/streak, result history, revision suggestions |
| Chapter marked complete | Curriculum progress, dashboard widgets, parent progress |
| Question bookmarked | Bookmarks page |
| Note created (incl. from tutor/voice/photo solver) | Notes page, search |
| Admin uploads a book | Admin books + ingestion queue + KB sources |
| Content approved → published | Review queue status; published questions appear in the student question bank |
| Admin/teacher publishes an exam | Student exam lists |
| Subscription changed | User plan + entitlements (quotas) |
| Every admin mutation | Audit log (`/admin/security`) |

## Permissions

See [`USER_ROLES.md`](USER_ROLES.md).
