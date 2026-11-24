import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminExams } from "@/components/admin/admin-exams";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "পরীক্ষা ব্যবস্থাপনা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminExams />
    </Suspense>
  );
}
