"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/api";
import type { WithChildren } from "@/types";

export function QueryProvider({ children }: WithChildren) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
