import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminContentReview } from "@/components/admin/admin-content";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "কনটেন্ট অনুমোদন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminContentReview />
    </Suspense>
  );
}
