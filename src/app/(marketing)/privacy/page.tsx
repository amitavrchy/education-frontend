import type { Metadata } from "next";
import { PrivacyPage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "গোপনীয়তা নীতি" };

export default function Page() {
  return <PrivacyPage />;
}
