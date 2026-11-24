import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminBoardQuestions } from "@/components/admin/admin-content";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "বোর্ড প্রশ্ন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminBoardQuestions />
    </Suspense>
  );
}
