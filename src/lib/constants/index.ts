import type { UserRole } from "@/types";

export const ROUTES = {
  home: "/",
  about: "/about",
  features: "/features",
  pricing: "/pricing",
  contact: "/contact",
  faq: "/faq",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  onboarding: "/onboarding",
} as const;

/** Landing route for each role after sign-in. */
export const ROLE_HOME: Record<UserRole, string> = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  institution: "/institution/dashboard",
  parent: "/parent/dashboard",
  admin: "/admin/dashboard",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "শিক্ষার্থী",
  teacher: "শিক্ষক",
  institution: "প্রতিষ্ঠান",
  parent: "অভিভাবক",
  admin: "অ্যাডমিন",
};

export const STORAGE_KEYS = {
  auth: "shikkhaai-auth",
  ui: "shikkhaai-ui",
} as const;

export const ACADEMIC_LEVELS = [
  "Class 6",
  "Class 7",
  "Class 8",
  "SSC",
  "HSC",
  "Admission",
] as const;

export const DEFAULT_PAGE_SIZE = 10;

export { fadeIn, fadeInUp, staggerContainer } from "./motion";
