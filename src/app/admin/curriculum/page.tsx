import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCurriculum } from "@/components/admin/admin-curriculum";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "কারিকুলাম" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminCurriculum />
    </Suspense>
  );
}
