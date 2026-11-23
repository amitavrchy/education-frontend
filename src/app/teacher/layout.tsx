import { PortalShell } from "@/components/shell/portal-shell";

export default function Layout({ children }: LayoutProps<"/teacher">) {
  return <PortalShell portal="teacher">{children}</PortalShell>;
}
