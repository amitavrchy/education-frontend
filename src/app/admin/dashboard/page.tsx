import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/admin-overview";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "অ্যাডমিন ড্যাশবোর্ড" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminDashboard />
    </Suspense>
  );
}
