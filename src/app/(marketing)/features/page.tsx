import type { Metadata } from "next";
import { FeaturesPage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "ফিচার" };

export default function Page() {
  return <FeaturesPage />;
}
