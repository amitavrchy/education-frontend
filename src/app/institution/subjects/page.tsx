import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionSubjects } from "@/components/institution/institution-setup";

export const metadata: Metadata = { title: "বিষয়" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionSubjects />
    </Suspense>
  );
}
