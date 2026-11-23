import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentDashboard } from "@/components/parent/parent-overview";

export const metadata: Metadata = { title: "অভিভাবক ড্যাশবোর্ড" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentDashboard />
    </Suspense>
  );
}
