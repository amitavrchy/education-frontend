import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionDashboard } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "প্রতিষ্ঠান ড্যাশবোর্ড" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionDashboard />
    </Suspense>
  );
}
