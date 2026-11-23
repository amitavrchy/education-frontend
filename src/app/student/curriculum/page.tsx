import type { Metadata } from "next";
import { CurriculumHome } from "@/components/student/curriculum/curriculum-home";

export const metadata: Metadata = { title: "কারিকুলাম" };

export default function Page() {
  return <CurriculumHome />;
}
