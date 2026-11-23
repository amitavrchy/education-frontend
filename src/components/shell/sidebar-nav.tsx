"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCan } from "@/hooks/use-auth";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { usePortal } from "./portal-context";

/** Permission-filtered portal links, shared by the desktop sidebar and the mobile drawer. */
export function SidebarNav({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const portal = usePortal();
  const can = useCan();
  const t = useT();

  return (
    <nav aria-label={t(portal.titleKey)} className="flex flex-col gap-4 px-3 py-4">
      {portal.sections.map((section, index) => {
        const items = section.items.filter((item) => can(item.permission));
        if (!items.length) return null;
        return (
          <div key={section.labelKey ?? index} className="flex flex-col gap-0.5">
            {section.labelKey && !collapsed && (
              <p className="px-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t(section.labelKey)}</p>
            )}
            {items.map((item) => {
              const href = `${portal.basePath}/${item.slug}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              const Icon = item.icon;
              const title = t(item.titleKey);
              const link = (
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    active && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                    collapsed && "justify-center px-0",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {collapsed ? <span className="sr-only">{title}</span> : <span className="flex-1 truncate">{title}</span>}
                  {!collapsed && item.badge && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
              if (!collapsed) return <div key={item.slug}>{link}</div>;
              return (
                <Tooltip key={item.slug}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{title}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
