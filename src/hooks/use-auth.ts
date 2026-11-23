"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { hasPermission, portalForRole, type Permission } from "@/lib/auth/permissions";
import { PORTAL_HOME, ROUTES } from "@/lib/constants";
import { authService } from "@/services";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthSession, UserRole } from "@/types";

export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

export function useRole(): UserRole | undefined {
  return useAuthStore((state) => state.user?.role);
}

/** Permission check for the current user. `can(undefined)` is always true. */
export function useCan() {
  const role = useRole();
  return useCallback((permission?: Permission | Permission[]) => hasPermission(role, permission), [role]);
}

export function homeFor(session: Pick<AuthSession, "user">): string {
  const { role, onboarded } = session.user;
  if (role === "student" && onboarded === false) return ROUTES.onboarding;
  return PORTAL_HOME[portalForRole(role)];
}

/** Stores a session and routes to the right landing page (or a safe `next` URL). */
export function useStartSession() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();
  return useCallback(
    (session: AuthSession, next?: string | null) => {
      queryClient.clear();
      setSession(session);
      const portal = portalForRole(session.user.role);
      const safeNext = next && next.startsWith(`/${portal}/`) ? next : null;
      router.replace(safeNext ?? homeFor(session));
    },
    [queryClient, router, setSession],
  );
}

export function useLogout() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await authService.logout().catch(() => undefined);
    clearSession();
    queryClient.clear();
    router.replace(ROUTES.login);
  }, [clearSession, queryClient, router]);
}

/** Demo-only role switcher. Keeps track of the account's real role so it can be restored. */
export function useSwitchRole() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useCallback(
    async (role: UserRole) => {
      const state = useAuthStore.getState();
      const original = state.originalRole ?? state.user?.role ?? null;
      const session = await authService.switchRole(role);
      queryClient.clear();
      state.setSession(session);
      useAuthStore.setState({ originalRole: original === role ? null : original });
      router.push(PORTAL_HOME[portalForRole(role)]);
    },
    [queryClient, router],
  );
}
