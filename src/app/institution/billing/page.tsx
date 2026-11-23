import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionBilling } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "বিলিং" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionBilling />
    </Suspense>
  );
}
