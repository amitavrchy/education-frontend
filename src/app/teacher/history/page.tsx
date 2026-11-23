import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherHistory } from "@/components/teacher/teacher-content";

export const metadata: Metadata = { title: "ইতিহাস" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherHistory />
    </Suspense>
  );
}
