import { PortalShell } from "@/components/shell/portal-shell";

export default function Layout({ children }: LayoutProps<"/student">) {
  return <PortalShell portal="student">{children}</PortalShell>;
}
