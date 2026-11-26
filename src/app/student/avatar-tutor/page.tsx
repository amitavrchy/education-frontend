import type { Metadata } from "next";
import { Suspense } from "react";
import { AvatarGallery } from "@/components/avatar/avatar-student";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "বইয়ের শিক্ষক" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AvatarGallery />
    </Suspense>
  );
}
