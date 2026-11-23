import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { OfflinePage } from "@/components/student/offline/offline-page";

export const metadata: Metadata = { title: "অফলাইন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OfflinePage />
    </Suspense>
  );
}
