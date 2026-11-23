import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TeacherSubmissionsPage } from "@/components/teacher/teacher-classroom";

export const metadata: Metadata = { title: "জমা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherSubmissionsPage />
    </Suspense>
  );
}
