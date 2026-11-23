/**
 * Per-feature status. Key = feature ID from the generated matrix.
 * Value: [status, tests?, note?]
 *   status: "done" (whole journey works in mock env) | "partial" | "todo" | "blocked"
 *   tests:  free text, e.g. "unit", "e2e", "unit+e2e"
 * Module-wide defaults: use the "PREFIX-*" key.
 * Anything not listed is "todo".
 */
export const status = {};
