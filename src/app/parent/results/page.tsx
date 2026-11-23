import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentResults } from "@/components/parent/parent-overview";

export const metadata: Metadata = { title: "ফলাফল" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentResults />
    </Suspense>
  );
}
