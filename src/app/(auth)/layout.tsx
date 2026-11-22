import { AuthLayout } from "@/components/layouts/auth-layout";

export default function Layout({ children }: LayoutProps<"/">) {
  return <AuthLayout>{children}</AuthLayout>;
}
