import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentCalendar } from "@/components/parent/parent-overview";

export const metadata: Metadata = { title: "ক্যালেন্ডার" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentCalendar />
    </Suspense>
  );
}
