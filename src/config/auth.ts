import type { UserRole } from "@/types";

/**
 * Route-access rules, ready for a future `proxy.ts` (Next.js 16's replacement for middleware)
 * or a server-side session check. Nothing enforces these yet.
 */
export const authConfig = {
  publicRoutes: ["/", "/about", "/features", "/pricing", "/contact", "/faq"],
  authRoutes: ["/login", "/register", "/forgot-password"],
  protectedPrefixes: {
    "/student": ["student"],
    "/teacher": ["teacher"],
    "/institution": ["institution"],
    "/parent": ["parent"],
    "/admin": ["admin"],
  } satisfies Record<string, UserRole[]>,
  loginRedirect: "/login",
} as const;
