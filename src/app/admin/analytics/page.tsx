import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminAnalytics } from "@/components/admin/admin-overview";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "বিশ্লেষণ" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminAnalytics />
    </Suspense>
  );
}
