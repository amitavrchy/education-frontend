import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";
import type { MessageKey } from "@/i18n";
import type { PortalKey } from "./user";

export interface NavItem {
  /** Route segment under the portal, e.g. "ai-tutor". */
  slug: string;
  titleKey: MessageKey;
  icon: LucideIcon;
  badge?: string;
  /** Hidden unless the user holds at least one of these permissions. */
  permission?: Permission | Permission[];
  /** Show in the student mobile bottom bar. */
  mobile?: boolean;
}

export interface NavSection {
  labelKey?: MessageKey;
  items: NavItem[];
}

export interface PortalNavigation {
  key: PortalKey;
  titleKey: MessageKey;
  basePath: `/${PortalKey}`;
  sections: NavSection[];
}

export interface MarketingNavLink {
  titleKey: MessageKey;
  href: string;
}
