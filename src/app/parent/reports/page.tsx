import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentReports } from "@/components/parent/parent-manage";

export const metadata: Metadata = { title: "রিপোর্ট" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentReports />
    </Suspense>
  );
}
