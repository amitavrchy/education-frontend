import type { Metadata } from "next";
import { AudiencePage } from "@/components/marketing/pages";

export const metadata: Metadata = { title: "কলেজের জন্য" };

export default function Page() {
  return <AudiencePage audience="colleges" />;
}
