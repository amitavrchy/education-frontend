import type { Metadata } from "next";
import { ResultsHistory } from "@/components/student/exams/results-history";

export const metadata: Metadata = { title: "ফলাফল" };

export default function Page() {
  return <ResultsHistory />;
}
