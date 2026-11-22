"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ROLE_HOME, ROUTES } from "@/lib/constants";
import { authService } from "@/services";
import { useAuthStore } from "@/stores";

export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      setSession(session);
      router.push(ROLE_HOME[session.user.role]);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      clearSession();
      router.push(ROUTES.login);
    },
  });
}
