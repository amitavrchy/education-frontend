import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionClasses } from "@/components/institution/institution-setup";

export const metadata: Metadata = { title: "শ্রেণি" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionClasses />
    </Suspense>
  );
}
