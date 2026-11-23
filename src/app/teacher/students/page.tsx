import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherStudents } from "@/components/teacher/teacher-classroom";

export const metadata: Metadata = { title: "শিক্ষার্থী" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherStudents />
    </Suspense>
  );
}
