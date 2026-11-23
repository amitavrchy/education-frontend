import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherDashboard } from "@/components/teacher/teacher-classroom";

export const metadata: Metadata = { title: "শিক্ষক ড্যাশবোর্ড" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherDashboard />
    </Suspense>
  );
}
