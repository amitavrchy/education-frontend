import { Skeleton } from "@/components/ui/skeleton";

/** Generic dashboard-shaped skeleton for loading.tsx files. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
