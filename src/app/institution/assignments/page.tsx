import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionAssignments } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "অ্যাসাইনমেন্ট" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionAssignments />
    </Suspense>
  );
}
