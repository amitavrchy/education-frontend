export * from "./format";

/** Simulated network latency for mock services. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
