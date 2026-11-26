import { env } from "@/config/env";
import type { ApiErrorBody } from "@/types";
import { ApiError } from "./api-error";

type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Skip attaching the Authorization header (e.g. login, register). */
  skipAuth?: boolean;
  /** Internal: set on the retry after a token refresh. */
  retried?: boolean;
}

type TokenGetter = () => string | null | undefined;
type UnauthorizedHandler = () => void;
/** Rotates the refresh token; resolves to the new access token, or null when the session is gone. */
type RefreshHandler = () => Promise<string | null>;

let getAccessToken: TokenGetter = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};
let refreshSession: RefreshHandler | null = null;
let refreshing: Promise<string | null> | null = null;

/**
 * Wire auth into the client without coupling it to a specific store.
 * Called once from AuthBridge in the providers tree.
 */
export function configureApiClient(options: {
  getToken?: TokenGetter;
  onUnauthorized?: UnauthorizedHandler;
  refresh?: RefreshHandler;
}) {
  if (options.getToken) getAccessToken = options.getToken;
  if (options.onUnauthorized) onUnauthorized = options.onUnauthorized;
  if (options.refresh) refreshSession = options.refresh;
}

/** One refresh at a time, shared by every request that hit a 401 meanwhile. */
function refreshOnce(): Promise<string | null> {
  refreshing ??= (refreshSession ? refreshSession() : Promise.resolve(null)).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  const url = new URL(`${base}/${path.replace(/^\//, "")}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, skipAuth, retried, headers, ...init } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isFormData) finalHeaders.set("Content-Type", "application/json");

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      headers: finalHeaders,
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Network error", 0);
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const errorBody = (payload ?? {}) as Partial<ApiErrorBody>;
    // Expired access token: rotate the refresh token once and replay the request.
    if (response.status === 401 && !skipAuth && !retried && refreshSession) {
      const token = await refreshOnce().catch(() => null);
      if (token) return request<T>(path, { ...options, retried: true });
    }
    if (response.status === 401 && !skipAuth) onUnauthorized();
    throw new ApiError(errorBody.message ?? response.statusText, response.status, errorBody);
  }

  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
