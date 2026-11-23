import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { PracticeHub } from "@/components/student/questions/practice-hub";

export const metadata: Metadata = { title: "অনুশীলন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PracticeHub />
    </Suspense>
  );
}
