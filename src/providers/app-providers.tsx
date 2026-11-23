"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WithChildren } from "@/types";
import { AuthBridge } from "./auth-bridge";
import { PreferencesBridge } from "./preferences-bridge";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function AppProviders({ children }: WithChildren) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider delayDuration={200}>
          <AuthBridge />
          <PreferencesBridge />
          {children}
          <Toaster richColors position="top-center" closeButton />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
