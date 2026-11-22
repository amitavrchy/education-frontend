import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/constants";

interface UiState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
    }),
    {
      name: STORAGE_KEYS.ui,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated after mount by <AuthBridge> to avoid SSR hydration mismatches.
      skipHydration: true,
      // Only the desktop collapse preference is worth remembering.
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
