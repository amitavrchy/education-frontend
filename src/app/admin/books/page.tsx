import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminBooks } from "@/components/admin/admin-books";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "বই ও ডকুমেন্ট" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminBooks />
    </Suspense>
  );
}
