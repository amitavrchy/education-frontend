import type { PortalKey, UserRole } from "@/types";

/**
 * Permission catalogue. The UI only ever asks "can this user do X?" — never "is this user role Y?" —
 * so a backend-issued permission list can replace this map without touching components.
 */
export const PERMISSIONS = [
  // Student / guardian
  "learn",
  "guardian.view",
  // Teacher & reviewer
  "teacher.dashboard",
  "content.create",
  "content.submit",
  "content.review",
  "content.approve",
  "content.publish",
  "rubric.manage",
  "exam.create",
  "assignment.manage",
  "submission.review",
  "evaluation.review",
  "students.view",
  // Institution
  "institution.manage",
  "institution.billing",
  // Admin
  "admin.access",
  "analytics.view",
  "curriculum.manage",
  "books.manage",
  "questions.manage",
  "board.manage",
  "institutionPapers.moderate",
  "exams.manage",
  "coverage.view",
  "kb.view",
  "kb.manage",
  "users.view",
  "users.manage",
  "users.support",
  "teachers.manage",
  "billing.view",
  "billing.manage",
  "moderation.handle",
  "notifications.manage",
  "audit.view",
  "security.manage",
  "roles.manage",
  "system.config",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const contentOps: Permission[] = [
  "curriculum.manage",
  "books.manage",
  "questions.manage",
  "board.manage",
  "institutionPapers.moderate",
  "exams.manage",
  "coverage.view",
  "content.review",
  "content.approve",
  "content.publish",
  "kb.view",
];

const allAdmin = PERMISSIONS.filter((p) => !["learn", "guardian.view", "institution.manage", "institution.billing"].includes(p));

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  student: ["learn"],
  parent: ["guardian.view"],
  teacher: [
    "teacher.dashboard",
    "content.create",
    "content.submit",
    "exam.create",
    "assignment.manage",
    "submission.review",
    "evaluation.review",
    "students.view",
  ],
  content_reviewer: [
    "teacher.dashboard",
    "content.create",
    "content.review",
    "content.approve",
    "rubric.manage",
    "evaluation.review",
  ],
  content_manager: ["admin.access", ...contentOps, "analytics.view"],
  school_admin: ["institution.manage", "institution.billing"],
  college_admin: ["institution.manage", "institution.billing"],
  support: ["admin.access", "users.view", "users.support", "billing.view", "moderation.handle", "notifications.manage"],
  platform_admin: allAdmin.filter((p) => p !== "security.manage" && p !== "roles.manage"),
  super_admin: allAdmin,
};

export const ROLE_PORTAL: Record<UserRole, PortalKey> = {
  student: "student",
  parent: "parent",
  teacher: "teacher",
  content_reviewer: "teacher",
  content_manager: "admin",
  school_admin: "institution",
  college_admin: "institution",
  support: "admin",
  platform_admin: "admin",
  super_admin: "admin",
};

export type PermissionMatrix = Record<UserRole, Permission[]>;

/** Pure check — `matrix` lets admin-edited overrides (Security → Permission matrix) take effect. */
export function hasPermission(
  role: UserRole | undefined | null,
  permission: Permission | Permission[] | undefined,
  matrix: PermissionMatrix = ROLE_PERMISSIONS,
): boolean {
  if (!permission) return true;
  if (!role) return false;
  const granted = matrix[role] ?? [];
  const needed = Array.isArray(permission) ? permission : [permission];
  // Any-of semantics: listing several permissions means "at least one".
  return needed.some((p) => granted.includes(p));
}

export function portalForRole(role: UserRole): PortalKey {
  return ROLE_PORTAL[role];
}

export function canAccessPortal(role: UserRole | undefined | null, portal: PortalKey): boolean {
  return !!role && ROLE_PORTAL[role] === portal;
}
