import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { BoardPaperViewer } from "@/components/student/archive/paper-viewer";

export default function Page({ params }: PageProps<"/student/board-questions/[paperId]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ paperId }) => <BoardPaperViewer paperId={paperId} />)}</Suspense>;
}
