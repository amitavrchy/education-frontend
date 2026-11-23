import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";

export const metadata: Metadata = { title: "প্রোফাইল সেটআপ" };

export default function Page() {
  return <OnboardingWizard />;
}
