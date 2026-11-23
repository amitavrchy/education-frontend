import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ParentPrivacy } from "@/components/parent/parent-manage";

export const metadata: Metadata = { title: "গোপনীয়তা" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentPrivacy />
    </Suspense>
  );
}
