import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherAssignments } from "@/components/teacher/teacher-classroom";

export const metadata: Metadata = { title: "অ্যাসাইনমেন্ট" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherAssignments />
    </Suspense>
  );
}
