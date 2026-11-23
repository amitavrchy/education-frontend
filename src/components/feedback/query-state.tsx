"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";

interface QueryStateProps<T> {
  query: Pick<UseQueryResult<T>, "data" | "isPending" | "isError" | "error" | "refetch">;
  /** Rendered while loading. Defaults to three skeleton bars. */
  loading?: ReactNode;
  /** Return true when the data should show the empty state. */
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

/** One place for loading → error (with retry) → empty → content. */
export function QueryState<T>({ query, loading, isEmpty, empty, children }: QueryStateProps<T>) {
  if (query.isPending)
    return (
      loading ?? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-10" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )
    );
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const data = query.data as T;
  if (isEmpty?.(data)) return <>{empty ?? <EmptyState title="" />}</>;
  return <>{children(data)}</>;
}
