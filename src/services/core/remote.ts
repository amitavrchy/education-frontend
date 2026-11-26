import { env } from "@/config/env";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types";

/**
 * API mode helpers for composite operations (dedicated backend endpoints, see
 * education-backend/docs/frontend-integration.md). Services keep their mock implementation and
 * branch on `isRemote()` for the server-side business rules.
 */
export const isRemote = () => !env.NEXT_PUBLIC_USE_MOCK_API;

type Body = unknown;

async function unwrap<T>(p: Promise<ApiResponse<T> | undefined>): Promise<T> {
  const res = await p;
  return (res && typeof res === "object" && "data" in res ? res.data : res) as T;
}

export const remote = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) => unwrap<T>(apiClient.get<ApiResponse<T>>(path, { query })),
  post: <T>(path: string, body?: Body) => unwrap<T>(apiClient.post<ApiResponse<T>>(path, body)),
  put: <T>(path: string, body?: Body) => unwrap<T>(apiClient.put<ApiResponse<T>>(path, body)),
  patch: <T>(path: string, body?: Body) => unwrap<T>(apiClient.patch<ApiResponse<T>>(path, body)),
  delete: <T>(path: string) => unwrap<T>(apiClient.delete<ApiResponse<T>>(path)),
};
