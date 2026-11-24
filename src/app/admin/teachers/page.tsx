import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminTeachers } from "@/components/admin/admin-people";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "শিক্ষক ও পর্যালোচক" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminTeachers />
    </Suspense>
  );
}
