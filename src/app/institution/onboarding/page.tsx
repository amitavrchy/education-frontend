import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionOnboarding } from "@/components/institution/institution-setup";

export const metadata: Metadata = { title: "অনবোর্ডিং" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionOnboarding />
    </Suspense>
  );
}
