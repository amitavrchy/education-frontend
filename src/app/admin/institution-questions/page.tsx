import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminInstitutionQuestions } from "@/components/admin/admin-content";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "প্রতিষ্ঠানের প্রশ্ন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminInstitutionQuestions />
    </Suspense>
  );
}
