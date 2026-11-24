# User Roles

Ten roles share five portals. Permissions are defined once in `src/lib/auth/permissions.ts`
(`ROLE_PERMISSIONS`), and navigation items declare the permission they need (`src/config/navigation.ts`).
The portal shell renders an access-denied state when a role opens a page it may not see.

> Client-side checks are for UX only. Production enforcement must happen on the server.

| Role | Portal | Demo login | Key permissions |
| --- | --- | --- | --- |
| Student | `/student` | `student@shikkha.ai` | `learn` |
| Parent / Guardian | `/parent` | `parent@shikkha.ai` | `guardian.view` (only what the student/policy allows) |
| Teacher | `/teacher` | `teacher@shikkha.ai` | create/submit content, exams, assignments, submissions, evaluations, students |
| Content Reviewer | `/teacher` | `reviewer@shikkha.ai` | review + approve content, rubrics |
| Content Manager | `/admin` | `content@shikkha.ai` | all content ops, publish, analytics |
| Customer Support | `/admin` | `support@shikkha.ai` | view users, support, billing view, moderation, notifications |
| Platform Administrator | `/admin` | `admin@shikkha.ai` | all admin except `security.manage`, `roles.manage` |
| Super Administrator | `/admin` | `super@shikkha.ai` | everything, incl. role/permission matrix and API keys |

School/college administrator roles and the institution portal were removed by product decision (2026-11-24).
Students of any age sign up without guardian permission.

Any password works for demo accounts; `wrongpass` simulates a wrong-password error. OTP is always `123456`.

## Demo role switcher

The user menu has a role switcher for development and testing. It is labelled as a demo tool and must not be
used as a security mechanism.

## Notable permission rules

- Reviewers can move content to `in_review`, `approved` or `changes_requested`. Only content managers and admins can
  publish or archive (`allowedTransitions` in `src/services/review.service.ts`).
- Support can view users but cannot suspend them, change roles, or open content-authoring pages.
- Guardians never see AI conversations unless the student explicitly shares them.

The full matrix is editable for super admins at `/admin/security` → Permission matrix (simulated persistence).
