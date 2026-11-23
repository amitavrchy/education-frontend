import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { SearchPage } from "@/components/student/search/search-page";

export const metadata: Metadata = { title: "অনুসন্ধান" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchPage />
    </Suspense>
  );
}
