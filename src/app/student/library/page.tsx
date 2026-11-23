import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { LibraryHome } from "@/components/student/library/library-home";

export const metadata: Metadata = { title: "পাঠ্যবই লাইব্রেরি" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <LibraryHome />
    </Suspense>
  );
}
