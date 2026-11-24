import type { Metadata } from "next";
import { AboutPage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "আমাদের সম্পর্কে" };

export default function Page() {
  return <AboutPage />;
}
