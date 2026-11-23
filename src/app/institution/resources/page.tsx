import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionResources } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "রিসোর্স" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionResources />
    </Suspense>
  );
}
