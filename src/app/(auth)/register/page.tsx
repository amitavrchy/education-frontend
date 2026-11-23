import type { Metadata } from "next";
import { RegisterScreen } from "@/components/auth/register-screen";

export const metadata: Metadata = { title: "নিবন্ধন" };

export default function Page() {
  return <RegisterScreen />;
}
