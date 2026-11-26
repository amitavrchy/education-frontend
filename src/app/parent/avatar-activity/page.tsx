import type { Metadata } from "next";
import { Suspense } from "react";
import { ParentAvatarActivity } from "@/components/avatar/avatar-manage";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "অ্যাভাটার শিক্ষকের ব্যবহার" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ParentAvatarActivity />
    </Suspense>
  );
}
