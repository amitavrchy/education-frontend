import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/common/section-placeholder";

export const metadata: Metadata = { title: "মূল্য পরিকল্পনা" };

export default function Page() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <SectionPlaceholder title="মূল্য পরিকল্পনা" />
    </div>
  );
}
