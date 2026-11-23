import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { NotesPage } from "@/components/student/notes/notes-page";

export const metadata: Metadata = { title: "নোটস" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NotesPage />
    </Suspense>
  );
}
