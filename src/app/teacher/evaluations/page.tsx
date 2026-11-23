import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherEvaluations } from "@/components/teacher/teacher-content";

export const metadata: Metadata = { title: "খাতা মূল্যায়ন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherEvaluations />
    </Suspense>
  );
}
