import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { QuestionPrintView } from "@/components/student/questions/print-view";

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuestionPrintView />
    </Suspense>
  );
}
