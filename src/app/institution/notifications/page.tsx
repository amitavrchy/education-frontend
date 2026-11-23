import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationCenter } from "@/components/common/notification-center";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "নোটিফিকেশন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NotificationCenter portal="institution" />
    </Suspense>
  );
}
