import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionExplorer } from "@/components/student/archive/institution-explorer";

export const metadata: Metadata = { title: "স্কুল-কলেজের প্রশ্ন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionExplorer />
    </Suspense>
  );
}
