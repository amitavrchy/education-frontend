import { Suspense } from "react";
import { PortalShell } from "@/components/shell/portal-shell";
import { ShellFallback } from "@/components/shell/shell-fallback";

export default function Layout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <PortalShell portal="admin">{children}</PortalShell>
    </Suspense>
  );
}
