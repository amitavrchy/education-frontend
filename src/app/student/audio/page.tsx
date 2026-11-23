import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { AudioCenter } from "@/components/student/audio/audio-center";

export const metadata: Metadata = { title: "অডিও রিভিশন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AudioCenter />
    </Suspense>
  );
}
