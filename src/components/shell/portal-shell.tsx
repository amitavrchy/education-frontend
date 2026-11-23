"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccessDenied } from "@/components/feedback/access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { getNavItem } from "@/config/navigation";
import { useT } from "@/i18n";
import { canAccessPortal, hasPermission } from "@/lib/auth/permissions";
import { ROUTES } from "@/lib/constants";
import { isSessionExpired, useAuthStore } from "@/stores/auth-store";
import type { PortalKey, WithChildren } from "@/types";
import { DemoBanner } from "./demo-banner";
import { Header } from "./header";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { OfflineBanner } from "./offline-banner";
import { PortalProvider } from "./portal-context";
import { Sidebar } from "./sidebar";

type GuardState = "loading" | "redirect" | "denied" | "ok";

/**
 * Client-side route guard (§5 ROLE-12). Mock auth lives in the browser, so the guard runs here;
 * with a real backend the same rules belong in `proxy.ts` + server session checks.
 */
function useGuard(portal: PortalKey): GuardState {
  const { user, expiresAt, hydrated } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const segment = pathname.split("/")[2];
  const item = segment ? getNavItem(portal, segment) : undefined;

  let state: GuardState = "ok";
  if (!hydrated) state = "loading";
  else if (!user || isSessionExpired(expiresAt)) state = "redirect";
  else if (user.role === "student" && user.onboarded === false && portal === "student") state = "redirect";
  else if (!canAccessPortal(user.role, portal)) state = "denied";
  else if (item?.permission && !hasPermission(user.role, item.permission)) state = "denied";

  useEffect(() => {
    if (state !== "redirect") return;
    if (user && isSessionExpired(expiresAt)) router.replace(`${ROUTES.sessionExpired}?next=${encodeURIComponent(pathname)}`);
    else if (!user) router.replace(`${ROUTES.login}?next=${encodeURIComponent(pathname)}`);
    else router.replace(ROUTES.onboarding);
  }, [state, user, expiresAt, pathname, router]);

  // Periodic expiry check while the tab stays open.
  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => {
      if (isSessionExpired(useAuthStore.getState().expiresAt)) router.replace(`${ROUTES.sessionExpired}?next=${encodeURIComponent(window.location.pathname)}`);
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [expiresAt, router]);

  return state;
}

export function PortalShell({ portal, children }: WithChildren<{ portal: PortalKey }>) {
  const state = useGuard(portal);
  const t = useT();
  return (
    <PortalProvider portal={portal}>
      <a href="#main" className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {t("shell.skipToContent")}
      </a>
      <div className="flex min-h-svh w-full">
        {state === "ok" || state === "denied" ? <Sidebar /> : null}
        <div className="flex min-w-0 flex-1 flex-col">
          {state === "ok" || state === "denied" ? (
            <>
              <DemoBanner />
              <Header />
              <OfflineBanner portalBase={`/${portal}`} />
            </>
          ) : null}
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 outline-none sm:px-6 md:pb-8 lg:py-8">
            {state === "ok" ? (
              children
            ) : state === "denied" ? (
              <AccessDenied />
            ) : (
              <div className="space-y-4" aria-busy="true">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-32" />
                <Skeleton className="h-64" />
              </div>
            )}
          </main>
        </div>
      </div>
      {state === "ok" && <MobileBottomNav />}
    </PortalProvider>
  );
}
