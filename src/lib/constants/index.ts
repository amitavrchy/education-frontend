import type { PortalKey } from "@/types";

export const ROUTES = {
  home: "/",
  about: "/about",
  features: "/features",
  pricing: "/pricing",
  contact: "/contact",
  faq: "/faq",
  help: "/help",
  terms: "/terms",
  privacy: "/privacy",
  accessibility: "/accessibility",
  welcome: "/welcome",
  login: "/login",
  register: "/register",
  verifyOtp: "/verify-otp",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  sessionExpired: "/session-expired",
  consent: "/consent",
  onboarding: "/onboarding",
} as const;

/** Landing route for each portal after sign-in. */
export const PORTAL_HOME: Record<PortalKey, string> = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  parent: "/parent/dashboard",
  admin: "/admin/dashboard",
};

export const STORAGE_KEYS = {
  auth: "shikkhaai-auth",
  ui: "shikkhaai-ui",
  preferences: "shikkhaai-preferences",
  onboardingDraft: "shikkhaai-onboarding-draft",
} as const;

export const DEFAULT_PAGE_SIZE = 10;

export { fadeIn, fadeInUp, staggerContainer } from "./motion";
