import type { Metadata } from "next";
import { ConsentScreen } from "@/components/auth/recovery-screens";

export const metadata: Metadata = { title: "গোপনীয়তা ও সম্মতি" };

export default function Page() {
  return <ConsentScreen />;
}
