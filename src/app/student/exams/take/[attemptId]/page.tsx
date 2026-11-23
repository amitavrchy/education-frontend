import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ExamRunner } from "@/components/student/exams/exam-runner";

export default function Page({ params }: PageProps<"/student/exams/take/[attemptId]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ attemptId }) => <ExamRunner attemptId={attemptId} />)}</Suspense>;
}
