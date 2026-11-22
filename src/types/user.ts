export const USER_ROLES = ["student", "teacher", "institution", "parent", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

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
  createdAt: string;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}
