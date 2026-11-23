import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionAnalytics } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "বিশ্লেষণ" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionAnalytics />
    </Suspense>
  );
}
