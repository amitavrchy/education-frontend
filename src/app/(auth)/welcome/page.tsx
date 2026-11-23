import type { Metadata } from "next";
import { WelcomeScreen } from "@/components/auth/recovery-screens";

export const metadata: Metadata = { title: "স্বাগতম" };

export default function Page() {
  return <WelcomeScreen />;
}
