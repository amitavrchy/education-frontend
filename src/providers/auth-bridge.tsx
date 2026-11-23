"use client";

import { useEffect } from "react";
import { configureApiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";

/** Rehydrates persisted stores after mount and connects the API client to the session. */
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
