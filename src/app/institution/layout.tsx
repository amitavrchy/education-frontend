import { InstitutionLayout } from "@/components/layouts/role-layouts";

export default function Layout({ children }: LayoutProps<"/institution">) {
  return <InstitutionLayout>{children}</InstitutionLayout>;
}
