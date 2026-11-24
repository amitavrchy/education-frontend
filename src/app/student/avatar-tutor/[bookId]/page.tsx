import type { Metadata } from "next";
import { Suspense } from "react";
import { AvatarClassroom } from "@/components/avatar/avatar-student";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export const metadata: Metadata = { title: "বইয়ের শিক্ষকের ক্লাস" };

export default function Page({ params }: PageProps<"/student/avatar-tutor/[bookId]">) {
  return <Suspense fallback={<PageSkeleton />}>{params.then(({ bookId }) => <AvatarClassroom bookId={bookId} />)}</Suspense>;
}
