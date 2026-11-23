import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { HelpCenter } from "@/components/common/help-center";

export const metadata: Metadata = { title: "সহায়তা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <HelpCenter />
    </Suspense>
  );
}
