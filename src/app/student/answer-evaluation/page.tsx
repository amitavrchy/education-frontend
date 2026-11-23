import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { AnswerEvaluation } from "@/components/student/evaluation/answer-evaluation";

export const metadata: Metadata = { title: "খাতা মূল্যায়ন" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnswerEvaluation />
    </Suspense>
  );
}
