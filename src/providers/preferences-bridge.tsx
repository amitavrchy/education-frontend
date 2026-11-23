"use client";

import { useEffect } from "react";
import { configureMockRuntime } from "@/services/core/mock-runtime";
import { usePreferencesStore } from "@/stores/preferences-store";

/** Applies persisted UI preferences to <html> and pushes developer knobs into the mock runtime. */
export function PreferencesBridge() {
  const { locale, highContrast, reducedMotion, textScale, mockFailureRate, simulateOffline } = usePreferencesStore();

  useEffect(() => {
    void usePreferencesStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dataset.contrast = highContrast ? "high" : "normal";
    html.dataset.motion = reducedMotion ? "reduce" : "auto";
    html.dataset.textScale = textScale;
  }, [locale, highContrast, reducedMotion, textScale]);

  useEffect(() => {
    configureMockRuntime({ failureRate: mockFailureRate, offline: simulateOffline });
  }, [mockFailureRate, simulateOffline]);

  return null;
}
