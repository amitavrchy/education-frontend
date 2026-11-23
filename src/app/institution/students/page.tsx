import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionPeople } from "@/components/institution/institution-setup";

export const metadata: Metadata = { title: "শিক্ষার্থী" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionPeople kind="student" />
    </Suspense>
  );
}
