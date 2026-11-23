"use client";

import { useSyncExternalStore } from "react";
import { usePreferencesStore } from "@/stores/preferences-store";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Real connectivity combined with the developer "simulate offline" switch. */
export function useOnline(): boolean {
  const browserOnline = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  const simulated = usePreferencesStore((s) => s.simulateOffline);
  return browserOnline && !simulated;
}
