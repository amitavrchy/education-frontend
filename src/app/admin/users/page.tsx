import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminUsers } from "@/components/admin/admin-people";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "ব্যবহারকারী" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminUsers />
    </Suspense>
  );
}
