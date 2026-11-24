import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "মূল্য" };

export default function Page() {
  return <PricingPage />;
}
