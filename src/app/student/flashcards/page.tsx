import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { FlashcardsPage } from "@/components/student/flashcards/flashcards-page";

export const metadata: Metadata = { title: "ফ্ল্যাশকার্ড" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FlashcardsPage />
    </Suspense>
  );
}
