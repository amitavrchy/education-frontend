import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherQuestions } from "@/components/teacher/teacher-content";

export const metadata: Metadata = { title: "প্রশ্ন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherQuestions />
    </Suspense>
  );
}
