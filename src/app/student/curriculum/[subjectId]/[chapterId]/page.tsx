import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ChapterDetail } from "@/components/student/curriculum/chapter-detail";

export default function Page({ params }: PageProps<"/student/curriculum/[subjectId]/[chapterId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {params.then(({ subjectId, chapterId }) => <ChapterDetail subjectId={subjectId} chapterId={chapterId} />)}
    </Suspense>
  );
}
