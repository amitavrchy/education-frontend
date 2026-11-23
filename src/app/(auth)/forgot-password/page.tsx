import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/components/auth/recovery-screens";

export const metadata: Metadata = { title: "পাসওয়ার্ড পুনরুদ্ধার" };

export default function Page() {
  return <ForgotPasswordScreen />;
}
