import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { PhotoSolver } from "@/components/student/photo-solver/photo-solver";

export const metadata: Metadata = { title: "ছবি থেকে সমাধান" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PhotoSolver />
    </Suspense>
  );
}
