"use client";

import { createContext, useContext } from "react";
import { portalNavigation } from "@/config/navigation";
import type { PortalKey, PortalNavigation, WithChildren } from "@/types";

const PortalContext = createContext<PortalNavigation | null>(null);

export function PortalProvider({ portal, children }: WithChildren<{ portal: PortalKey }>) {
  return <PortalContext value={portalNavigation[portal]}>{children}</PortalContext>;
}

export function usePortal(): PortalNavigation {
  const context = useContext(PortalContext);
  if (!context) throw new Error("usePortal must be used inside <PortalProvider>");
  return context;
}

/** Same as usePortal but safe outside portals (marketing/auth pages). */
export function useOptionalPortal(): PortalNavigation | null {
  return useContext(PortalContext);
}
