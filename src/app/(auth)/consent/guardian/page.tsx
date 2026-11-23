import type { Metadata } from "next";
import { GuardianConsentScreen } from "@/components/auth/guardian-consent-screen";

export const metadata: Metadata = { title: "অভিভাবকের সম্মতি" };

export default function Page() {
  return <GuardianConsentScreen />;
}
