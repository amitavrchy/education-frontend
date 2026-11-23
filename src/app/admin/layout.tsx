import { PortalShell } from "@/components/shell/portal-shell";

export default function Layout({ children }: LayoutProps<"/admin">) {
  return <PortalShell portal="admin">{children}</PortalShell>;
}
