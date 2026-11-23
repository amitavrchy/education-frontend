import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionSessions } from "@/components/institution/institution-setup";

export const metadata: Metadata = { title: "শিক্ষাবর্ষ" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionSessions />
    </Suspense>
  );
}
