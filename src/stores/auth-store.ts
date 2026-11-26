import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/constants";
import type { AuthSession, User, UserRole } from "@/types";

const SESSION_MARKER = "shikkhaai-session-alive";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** API mode only: rotated through POST /auth/refresh. */
  refreshToken: string | null;
  expiresAt: string | null;
  remember: boolean;
  /** Real role of the signed-in account while the demo role switcher impersonates another role. */
  originalRole: UserRole | null;
  hydrated: boolean;
  setSession: (session: AuthSession) => void;
  updateUser: (patch: Partial<User>) => void;
  clearSession: () => void;
  extendSession: () => void;
}

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const REMEMBER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Client-side session holder (mock). A real backend should keep tokens in httpOnly cookies and only
 * expose the profile here. "Remember me" = survives a browser restart; otherwise a sessionStorage
 * marker is required, which the browser drops when it closes.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      remember: false,
      originalRole: null,
      hydrated: false,
      setSession: (session) => {
        try {
          sessionStorage.setItem(SESSION_MARKER, "1");
        } catch {}
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? null,
          expiresAt: session.expiresAt,
          remember: !!session.remember,
        });
      },
      updateUser: (patch) => {
        const user = get().user;
        if (user) set({ user: { ...user, ...patch } });
      },
      clearSession: () => set({ user: null, accessToken: null, refreshToken: null, expiresAt: null, originalRole: null }),
      extendSession: () => {
        const ttl = get().remember ? REMEMBER_TTL_MS : SESSION_TTL_MS;
        set({ expiresAt: new Date(Date.now() + ttl).toISOString() });
      },
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ user, accessToken, refreshToken, expiresAt, remember, originalRole }) => ({
        user,
        accessToken,
        refreshToken,
        expiresAt,
        remember,
        originalRole,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        let alive = true;
        try {
          alive = sessionStorage.getItem(SESSION_MARKER) === "1";
        } catch {}
        if (state.user && !state.remember && !alive) state.clearSession();
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);

export function isSessionExpired(expiresAt: string | null): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() < Date.now();
}
