import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentProgress } from "@/components/parent/parent-overview";

export const metadata: Metadata = { title: "অগ্রগতি" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentProgress />
    </Suspense>
  );
}
