import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionQuestionBank } from "@/components/institution/institution-academics";

export const metadata: Metadata = { title: "প্রশ্ন ব্যাংক" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <InstitutionQuestionBank />
    </Suspense>
  );
}
