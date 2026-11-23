import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { LabsPage } from "@/components/student/labs/labs-page";

export const metadata: Metadata = { title: "বিজ্ঞান ও গণিত ল্যাব" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LabsPage />
    </Suspense>
  );
}
