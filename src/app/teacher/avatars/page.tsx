import type { Metadata } from "next";
import { Suspense } from "react";
import { TeacherAvatars } from "@/components/avatar/avatar-manage";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "অ্যাভাটার শিক্ষক" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TeacherAvatars />
    </Suspense>
  );
}
