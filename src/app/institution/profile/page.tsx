import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionProfile } from "@/components/institution/institution-setup";

export const metadata: Metadata = { title: "প্রোফাইল" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionProfile />
    </Suspense>
  );
}
