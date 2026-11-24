import type { Metadata } from "next";
import { AudiencePage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "স্কুলের জন্য" };

export default function Page() {
  return <AudiencePage audience="schools" />;
}
