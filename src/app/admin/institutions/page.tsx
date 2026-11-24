import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminInstitutions } from "@/components/admin/admin-people";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "প্রতিষ্ঠান" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminInstitutions />
    </Suspense>
  );
}
