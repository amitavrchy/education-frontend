/** Every role the platform supports (master prompt §5). */
export const USER_ROLES = [
  "student",
  "parent",
  "teacher",
  "content_reviewer",
  "content_manager",
  "support",
  "platform_admin",
  "super_admin",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Portals are UI shells. Several roles can share one portal with different permissions. */
export const PORTALS = ["student", "parent", "teacher", "admin"] as const;

export type PortalKey = (typeof PORTALS)[number];

export type AccountStatus = "active" | "suspended" | "pending_deletion" | "invited";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  /** e.g. "HSC 2026", "Class 10" — only meaningful for students. */
  academicLevel?: string;
  institutionId?: string;
  status?: AccountStatus;
  /** True once the student finished the onboarding wizard. */
  onboarded?: boolean;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  /** Set when "remember me" was ticked: session survives a browser restart. */
  remember?: boolean;
}
