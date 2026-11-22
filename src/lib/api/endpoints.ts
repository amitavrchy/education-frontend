/** Backend endpoint paths, relative to NEXT_PUBLIC_API_URL. */
export const endpoints = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
    me: "/auth/me",
    forgotPassword: "/auth/forgot-password",
  },
  notifications: {
    list: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
  },
  dashboard: {
    summary: (role: string) => `/dashboard/${role}/summary`,
  },
} as const;
