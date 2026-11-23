import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { TutorPage } from "@/components/student/tutor/tutor-page";

export const metadata: Metadata = { title: "AI টিউটর" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TutorPage />
    </Suspense>
  );
}
