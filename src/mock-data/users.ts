import type { User, UserRole } from "@/types";

export const mockUsers: Record<UserRole, User> = {
  student: {
    id: "u-student-1",
    name: "রাফি আহমেদ",
    email: "student@shikkha.ai",
    phone: "01711000001",
    role: "student",
    academicLevel: "HSC 2026",
    createdAt: "2026-01-10T08:00:00.000Z",
  },
  teacher: {
    id: "u-teacher-1",
    name: "নাসরিন সুলতানা",
    email: "teacher@shikkha.ai",
    role: "teacher",
    createdAt: "2025-09-01T08:00:00.000Z",
  },
  institution: {
    id: "u-inst-1",
    name: "ঢাকা আইডিয়াল কলেজ",
    email: "institution@shikkha.ai",
    role: "institution",
    createdAt: "2025-06-15T08:00:00.000Z",
  },
  parent: {
    id: "u-parent-1",
    name: "করিম উদ্দিন",
    email: "parent@shikkha.ai",
    role: "parent",
    createdAt: "2026-02-20T08:00:00.000Z",
  },
  admin: {
    id: "u-admin-1",
    name: "সিস্টেম অ্যাডমিন",
    email: "admin@shikkha.ai",
    role: "admin",
    createdAt: "2025-01-01T08:00:00.000Z",
  },
};
