import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionExams } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "পরীক্ষা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionExams />
    </Suspense>
  );
}
