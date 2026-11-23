import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherRubrics } from "@/components/teacher/teacher-content";

export const metadata: Metadata = { title: "রুব্রিক" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherRubrics />
    </Suspense>
  );
}
