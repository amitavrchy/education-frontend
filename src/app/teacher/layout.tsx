import { TeacherLayout } from "@/components/layouts/role-layouts";

export default function Layout({ children }: LayoutProps<"/teacher">) {
  return <TeacherLayout>{children}</TeacherLayout>;
}
