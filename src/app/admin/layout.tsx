import { AdminLayout } from "@/components/layouts/role-layouts";

export default function Layout({ children }: LayoutProps<"/admin">) {
  return <AdminLayout>{children}</AdminLayout>;
}
