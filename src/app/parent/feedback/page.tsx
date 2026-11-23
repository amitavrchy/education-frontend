import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentFeedback } from "@/components/parent/parent-manage";

export const metadata: Metadata = { title: "শিক্ষকের মন্তব্য" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentFeedback />
    </Suspense>
  );
}
