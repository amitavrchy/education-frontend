import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { NoteDetail } from "@/components/student/notes/note-detail";

export default function Page({ params }: PageProps<"/student/notes/[noteId]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ noteId }) => <NoteDetail noteId={noteId} />)}</Suspense>;
}
