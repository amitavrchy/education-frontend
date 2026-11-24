import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminSecurity } from "@/components/admin/admin-system";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "নিরাপত্তা ও অডিট" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminSecurity />
    </Suspense>
  );
}
