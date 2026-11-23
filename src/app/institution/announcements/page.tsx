import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionAnnouncements } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "ঘোষণা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionAnnouncements />
    </Suspense>
  );
}
