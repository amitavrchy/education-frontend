import { ParentLayout } from "@/components/layouts/role-layouts";

export default function Layout({ children }: LayoutProps<"/parent">) {
  return <ParentLayout>{children}</ParentLayout>;
}
