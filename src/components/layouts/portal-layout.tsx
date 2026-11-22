import { Header } from "@/components/navigation/header";
import { Sidebar } from "@/components/navigation/sidebar";
import { PortalProvider } from "@/contexts/portal-context";
import type { PortalKey, WithChildren } from "@/types";

/**
 * Shared shell for all authenticated portals: sidebar + header + content area.
 * Role-specific layouts below are thin wrappers so each portal can diverge later.
 */
export function PortalLayout({ portal, children }: WithChildren<{ portal: PortalKey }>) {
  return (
    <PortalProvider portal={portal}>
      <div className="flex min-h-svh w-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        </div>
      </div>
    </PortalProvider>
  );
}
