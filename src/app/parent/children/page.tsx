import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentChildren } from "@/components/parent/parent-manage";

export const metadata: Metadata = { title: "আমার সন্তান" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentChildren />
    </Suspense>
  );
}
