import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsPage } from "@/components/common/settings/settings-page";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "সেটিংস" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPage portal="admin" />
    </Suspense>
  );
}
