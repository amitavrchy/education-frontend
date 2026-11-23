import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordScreen } from "@/components/auth/recovery-screens";

export const metadata: Metadata = { title: "নতুন পাসওয়ার্ড" };

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordScreen />
    </Suspense>
  );
}
