import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminModeration } from "@/components/admin/admin-system";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "মডারেশন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminModeration />
    </Suspense>
  );
}
