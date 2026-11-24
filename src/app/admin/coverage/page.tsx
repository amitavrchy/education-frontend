import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCoverage } from "@/components/admin/admin-overview";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "কনটেন্ট কভারেজ" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminCoverage />
    </Suspense>
  );
}
