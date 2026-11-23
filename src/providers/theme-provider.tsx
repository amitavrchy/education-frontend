"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { WithChildren } from "@/types";

/** Light / dark / system theme, persisted by next-themes in localStorage. */
export function ThemeProvider({ children }: WithChildren) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
