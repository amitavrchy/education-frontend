"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { WithChildren } from "@/types";
import { AuthBridge } from "./auth-bridge";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

/** Every client-side provider, composed once and mounted in the root layout. */
export function AppProviders({ children }: WithChildren) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider delayDuration={200}>
          <AuthBridge />
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
