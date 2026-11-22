import { StudentLayout } from "@/components/layouts/role-layouts";

export default function Layout({ children }: LayoutProps<"/student">) {
  return <StudentLayout>{children}</StudentLayout>;
}
