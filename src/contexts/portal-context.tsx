"use client";

import { createContext, useContext } from "react";
import { portalNavigation } from "@/config/navigation";
import type { PortalKey, PortalNavigation, WithChildren } from "@/types";

const PortalContext = createContext<PortalNavigation | null>(null);

/** Tells nested components (sidebar, breadcrumbs, header) which portal they are rendered in. */
export function PortalProvider({ portal, children }: WithChildren<{ portal: PortalKey }>) {
  return <PortalContext value={portalNavigation[portal]}>{children}</PortalContext>;
}

export function usePortal(): PortalNavigation {
  const context = useContext(PortalContext);
  if (!context) throw new Error("usePortal must be used inside <PortalProvider>");
  return context;
}
