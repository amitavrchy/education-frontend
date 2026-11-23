import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { SubjectOverview } from "@/components/student/curriculum/subject-overview";

export default function Page({ params }: PageProps<"/student/curriculum/[subjectId]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ subjectId }) => <SubjectOverview subjectId={subjectId} />)}</Suspense>;
}
