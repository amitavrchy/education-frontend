import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { VoiceTutor } from "@/components/student/voice/voice-tutor";

export const metadata: Metadata = { title: "ভয়েস টিউটর" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <VoiceTutor />
    </Suspense>
  );
}
