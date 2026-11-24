import type { Metadata } from "next";
import { PublicHelpPage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "সাহায্য কেন্দ্র" };

export default function Page() {
  return <PublicHelpPage />;
}
