import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminKnowledgeBase } from "@/components/admin/admin-kb";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "AI জ্ঞানভান্ডার" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminKnowledgeBase />
    </Suspense>
  );
}
