import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherAnalytics } from "@/components/teacher/teacher-classroom";

export const metadata: Metadata = { title: "বিশ্লেষণ" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherAnalytics />
    </Suspense>
  );
}
