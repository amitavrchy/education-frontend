import { PortalShell } from "@/components/shell/portal-shell";

export default function Layout({ children }: LayoutProps<"/parent">) {
  return <PortalShell portal="parent">{children}</PortalShell>;
}
