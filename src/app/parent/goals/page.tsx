import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentGoals } from "@/components/parent/parent-manage";

export const metadata: Metadata = { title: "লক্ষ্য" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentGoals />
    </Suspense>
  );
}
