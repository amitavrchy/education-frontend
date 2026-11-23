import { Skeleton } from "@/components/ui/skeleton";

/** Static shell shown while the client portal shell (auth + URL-dependent UI) loads. */
export function ShellFallback() {
  return (
    <div className="flex min-h-svh w-full" aria-busy="true">
      <div className="hidden w-sidebar shrink-0 border-r bg-sidebar p-4 lg:block">
        <Skeleton className="mb-6 h-9 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <div className="h-header border-b" />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
