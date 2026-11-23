import { Suspense } from "react";
import { PortalShell } from "@/components/shell/portal-shell";
import { ShellFallback } from "@/components/shell/shell-fallback";

export default function Layout({ children }: LayoutProps<"/parent">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <PortalShell portal="parent">{children}</PortalShell>
    </Suspense>
  );
}
