import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherReview } from "@/components/teacher/teacher-content";

export const metadata: Metadata = { title: "পর্যালোচনা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherReview />
    </Suspense>
  );
}
