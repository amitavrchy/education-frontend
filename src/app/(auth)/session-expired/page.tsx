import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionExpiredScreen } from "@/components/auth/recovery-screens";

export const metadata: Metadata = { title: "সেশনের মেয়াদ শেষ" };

export default function Page() {
  return (
    <Suspense>
      <SessionExpiredScreen />
    </Suspense>
  );
}
