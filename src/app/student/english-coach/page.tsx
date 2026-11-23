import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { EnglishCoach } from "@/components/student/english/english-coach";

export const metadata: Metadata = { title: "ইংরেজি কোচ" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EnglishCoach />
    </Suspense>
  );
}
