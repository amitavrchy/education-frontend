import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ExamResultView } from "@/components/student/exams/exam-result";

export default function Page({ params }: PageProps<"/student/exams/results/[attemptId]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ attemptId }) => <ExamResultView attemptId={attemptId} />)}</Suspense>;
}
