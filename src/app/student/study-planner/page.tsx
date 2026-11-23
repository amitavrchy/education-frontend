import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { PlannerPage } from "@/components/student/planner/planner-page";

export const metadata: Metadata = { title: "স্টাডি প্ল্যানার" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PlannerPage />
    </Suspense>
  );
}
