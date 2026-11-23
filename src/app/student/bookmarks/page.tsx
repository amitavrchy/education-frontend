import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { BookmarksPage } from "@/components/student/bookmarks/bookmarks-page";

export const metadata: Metadata = { title: "বুকমার্ক" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BookmarksPage />
    </Suspense>
  );
}
