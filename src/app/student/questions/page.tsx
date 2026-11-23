import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { QuestionBank } from "@/components/student/questions/question-bank";

export const metadata: Metadata = { title: "প্রশ্ন ব্যাংক" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuestionBank />
    </Suspense>
  );
}
