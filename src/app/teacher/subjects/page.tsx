import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherSubjects } from "@/components/teacher/teacher-classroom";

export const metadata: Metadata = { title: "বিষয়" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherSubjects />
    </Suspense>
  );
}
