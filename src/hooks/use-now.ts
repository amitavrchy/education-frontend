"use client";

import { useState } from "react";

/**
 * Current time captured once per mount. Keeps render pure (React Compiler forbids
 * `Date.now()` during render) while still giving "today"-relative calculations.
 */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}
