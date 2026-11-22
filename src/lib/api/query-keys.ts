/** Centralized query keys so cache invalidation stays predictable. */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (params?: Record<string, unknown>) => ["notifications", "list", params] as const,
  },
  dashboard: {
    summary: (role: string) => ["dashboard", role, "summary"] as const,
  },
};
