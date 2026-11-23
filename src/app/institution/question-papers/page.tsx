import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionPapers } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "প্রশ্নপত্র" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionPapers />
    </Suspense>
  );
}
