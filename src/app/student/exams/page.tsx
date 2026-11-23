import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ExamHub } from "@/components/student/exams/exam-hub";

export const metadata: Metadata = { title: "পরীক্ষা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExamHub />
    </Suspense>
  );
}
