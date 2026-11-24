import type { Metadata } from "next";
import { FaqPage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "প্রশ্নোত্তর" };

export default function Page() {
  return <FaqPage />;
}
