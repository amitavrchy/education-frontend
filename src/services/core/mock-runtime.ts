import { ApiError } from "@/lib/api/api-error";

/**
 * Runtime knobs for mock services (latency, simulated failures, simulated offline).
 * The preferences store pushes values in here so services stay free of React/Zustand.
 */
const runtime = {
  failureRate: 0,
  offline: false,
  latencyScale: 1,
};

export function configureMockRuntime(patch: Partial<typeof runtime>) {
  Object.assign(runtime, patch);
}

export function getMockRuntime() {
  return { ...runtime };
}

export function isEffectivelyOffline(): boolean {
  if (runtime.offline) return true;
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Simulated network round-trip. Throws a network ApiError when offline or when the
 * developer failure-rate dial says so — this is how error states are demonstrated.
 * `requiresNetwork: false` marks operations that also work offline (local-first data).
 */
export async function mockRequest(ms = 250, { requiresNetwork = false } = {}): Promise<void> {
  if (requiresNetwork && isEffectivelyOffline()) {
    throw new ApiError("Offline", 0, { code: "OFFLINE" });
  }
  await new Promise((resolve) => setTimeout(resolve, Math.round(ms * runtime.latencyScale)));
  if (runtime.failureRate > 0 && Math.random() < runtime.failureRate) {
    throw new ApiError("Simulated network failure", 0, { code: "SIMULATED_FAILURE" });
  }
}

export function notFound(entity: string, id: string): never {
  throw new ApiError(`${entity} not found: ${id}`, 404, { code: "NOT_FOUND" });
}

export function forbidden(message = "Forbidden"): never {
  throw new ApiError(message, 403, { code: "FORBIDDEN" });
}

export function invalid(message: string, errors?: Record<string, string[]>): never {
  throw new ApiError(message, 422, { code: "VALIDATION", errors });
}

/** Deterministic id generator for client-created records. */
export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}${rand}`;
}

export const nowIso = () => new Date().toISOString();
