import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { AdaptivePage } from "@/components/student/adaptive/adaptive-page";

export const metadata: Metadata = { title: "অ্যাডাপটিভ লার্নিং" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdaptivePage />
    </Suspense>
  );
}
