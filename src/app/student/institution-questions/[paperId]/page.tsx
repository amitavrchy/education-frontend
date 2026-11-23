import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { InstitutionPaperViewer } from "@/components/student/archive/paper-viewer";

export default function Page({ params }: PageProps<"/student/institution-questions/[paperId]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ paperId }) => <InstitutionPaperViewer paperId={paperId} />)}</Suspense>;
}
