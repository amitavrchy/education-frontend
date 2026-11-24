# State Management

| Kind of state | Tool | Where |
| --- | --- | --- |
| Server/domain data (questions, exams, notes…) | TanStack Query over services | `useQuery`/`useMutation` in components and `src/hooks/*` |
| Auth session | Zustand + `persist` (localStorage; sessionStorage marker unless "remember me") | `src/stores/auth-store.ts` |
| Preferences (locale, digits, theme extras, text size, contrast, reduced motion, dashboard layout, simulate offline) | Zustand + `persist` (localStorage) | `src/stores/preferences-store.ts` |
| UI chrome (sidebar collapsed, etc.) | Zustand | `src/stores/ui-store.ts` |
| Form state | React Hook Form + Zod, or local state with explicit validation | per form |
| Ephemeral view state | `useState` | components |

## Query keys and invalidation

Query keys are arrays starting with the domain (`["questions", …]`, `["exams", …]`, `["admin", …]`).
Mutations invalidate their domain prefix, so related views refresh. For example, publishing an exam
invalidates `["exams"]`, and both the admin list and student exam hub update.

## Mock runtime knobs

`configureMockRuntime({ latencyScale, failureRate, offline })` in `src/services/core/mock-runtime.ts`. The
preferences bridge feeds it from developer settings, so loading and error states can be shown on demand.
Tests set `latencyScale: 0`.

## Reusable hooks

`use-auth` (current user, `useCan`, login/logout/role switch) · `use-curriculum` (indexed curriculum
snapshot) · `use-student` (profile) · `use-progress` (chapter progress, mastery) · `use-planner` ·
`use-notifications` · `use-offline` · `use-online` · `use-debounce` · `use-now`.
