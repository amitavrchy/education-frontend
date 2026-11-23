import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { StudentDashboard } from "@/components/student/dashboard/student-dashboard";

export const metadata: Metadata = { title: "ড্যাশবোর্ড" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StudentDashboard />
    </Suspense>
  );
}
