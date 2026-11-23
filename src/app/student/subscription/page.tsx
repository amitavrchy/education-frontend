import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { SubscriptionPage } from "@/components/common/subscription-page";

export const metadata: Metadata = { title: "সাবস্ক্রিপশন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SubscriptionPage portal="student" />
    </Suspense>
  );
}
