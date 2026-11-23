import type { Metadata } from "next";
import { Suspense } from "react";
import { OtpScreen } from "@/components/auth/otp-screen";

export const metadata: Metadata = { title: "OTP যাচাই" };

export default function Page() {
  return (
    <Suspense>
      <OtpScreen />
    </Suspense>
  );
}
