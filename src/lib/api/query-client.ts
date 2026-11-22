import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-error";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry client errors (bad input, unauthorized, not found).
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** New client per server render; one shared client in the browser. */
export function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
