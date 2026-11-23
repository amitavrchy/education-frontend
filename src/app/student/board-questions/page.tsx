import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { BoardExplorer } from "@/components/student/archive/board-explorer";

export const metadata: Metadata = { title: "বোর্ড প্রশ্ন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BoardExplorer />
    </Suspense>
  );
}
