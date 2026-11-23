import { PortalShell } from "@/components/shell/portal-shell";

export default function Layout({ children }: LayoutProps<"/institution">) {
  return <PortalShell portal="institution">{children}</PortalShell>;
}
