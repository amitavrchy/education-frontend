import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { BookReader } from "@/components/student/library/book-reader";

export default function Page({ params }: PageProps<"/student/library/[bookId]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ bookId }) => <BookReader bookId={bookId} />)}</Suspense>;
}
