import type { LucideIcon } from "lucide-react";
import type { UserRole } from "./user";

export type PortalKey = UserRole;

export interface NavItem {
  /** Route segment under the portal, e.g. "ai-tutor". */
  slug: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export interface PortalNavigation {
  key: PortalKey;
  title: string;
  basePath: `/${PortalKey}`;
  sections: NavSection[];
}

export interface MarketingNavLink {
  title: string;
  href: string;
}
