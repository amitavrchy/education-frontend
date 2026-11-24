import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminQuestions } from "@/components/admin/admin-content";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "প্রশ্ন ব্যবস্থাপনা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminQuestions />
    </Suspense>
  );
}
