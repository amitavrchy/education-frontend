import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/constants";
import type { AuthSession, User } from "@/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

/**
 * Client-side session holder (mock for now).
 * When the backend lands, prefer httpOnly cookies for tokens and keep only the user profile here.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setSession: (session) => set({ user: session.user, accessToken: session.accessToken }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated after mount by <AuthBridge> to avoid SSR hydration mismatches.
      skipHydration: true,
    },
  ),
);
