"use client";

import { useEffect } from "react";
import { configureApiClient } from "@/lib/api";
import { useAuthStore, useUiStore } from "@/stores";

/**
 * Runs once on the client:
 * - rehydrates persisted Zustand stores after the first render (prevents hydration mismatches)
 * - connects the API client to the auth store (token injection + 401 handling)
 */
export function AuthBridge() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    void useUiStore.persist.rehydrate();

    configureApiClient({
      getToken: () => useAuthStore.getState().accessToken,
      onUnauthorized: () => useAuthStore.getState().clearSession(),
    });
  }, []);

  return null;
}
