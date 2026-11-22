"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Hook up an error-reporting service here later.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60svh] items-center justify-center">
      <ErrorState onRetry={retry} />
    </main>
  );
}
