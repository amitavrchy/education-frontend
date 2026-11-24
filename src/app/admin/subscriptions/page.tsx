import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSubscriptions } from "@/components/admin/admin-billing";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "সাবস্ক্রিপশন ও বিলিং" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminSubscriptions />
    </Suspense>
  );
}
