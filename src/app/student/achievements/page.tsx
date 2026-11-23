import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { AchievementsPage } from "@/components/student/achievements/achievements-page";

export const metadata: Metadata = { title: "অর্জন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AchievementsPage />
    </Suspense>
  );
}
