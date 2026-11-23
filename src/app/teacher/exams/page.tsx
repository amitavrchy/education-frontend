import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherExams } from "@/components/teacher/teacher-classroom";

export const metadata: Metadata = { title: "পরীক্ষা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherExams />
    </Suspense>
  );
}
