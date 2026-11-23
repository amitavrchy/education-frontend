import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/constants";

export type Locale = "bn" | "en";
export type TextScale = "sm" | "md" | "lg" | "xl";
export type DigitStyle = "auto" | "latin";

/**
 * Lightweight UI preferences (localStorage, per master prompt §2).
 * Domain data (notes, attempts, …) lives in the IndexedDB mock DB instead.
 * The colour theme itself is owned by next-themes.
 */
interface PreferencesState {
  locale: Locale;
  highContrast: boolean;
  reducedMotion: boolean;
  textScale: TextScale;
  /** "auto" = Bangla digits in the Bangla UI. */
  digits: DigitStyle;
  /** Student dashboard widget order + hidden widgets. */
  dashboardOrder: string[];
  dashboardHidden: string[];
  /** Gamification: let students opt out of leaderboards / friend challenges. */
  hideCompetitive: boolean;
  recentSearches: string[];
  /** Developer aids for demonstrating error/offline states. */
  mockFailureRate: number;
  simulateOffline: boolean;
  /** Onboarding tour on the dashboard has been dismissed. */
  dashboardIntroSeen: boolean;

  set: <K extends keyof PreferencesData>(key: K, value: PreferencesData[K]) => void;
  addRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
}

export type PreferencesData = Omit<
  PreferencesState,
  "set" | "addRecentSearch" | "removeRecentSearch" | "clearRecentSearches"
>;

export const DEFAULT_PREFERENCES: PreferencesData = {
  locale: "bn",
  highContrast: false,
  reducedMotion: false,
  textScale: "md",
  digits: "auto",
  dashboardOrder: [],
  dashboardHidden: [],
  hideCompetitive: false,
  recentSearches: [],
  mockFailureRate: 0,
  simulateOffline: false,
  dashboardIntroSeen: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      set: (key, value) => set({ [key]: value } as Partial<PreferencesState>),
      addRecentSearch: (query) =>
        set((state) => {
          const q = query.trim();
          if (!q) return state;
          return { recentSearches: [q, ...state.recentSearches.filter((s) => s !== q)].slice(0, 8) };
        }),
      removeRecentSearch: (query) =>
        set((state) => ({ recentSearches: state.recentSearches.filter((s) => s !== query) })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: STORAGE_KEYS.preferences,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
