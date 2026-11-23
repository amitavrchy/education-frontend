"use client";

import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { portalItems } from "@/config/navigation";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores";
import { usePortal } from "./portal-context";

/** Student mobile bottom navigation (below md). "More" opens the full drawer. */
export function MobileBottomNav() {
  const portal = usePortal();
  const pathname = usePathname();
  const t = useT();
  const openDrawer = useUiStore((s) => s.setMobileSidebarOpen);
  if (portal.key !== "student") return null;
  const items = portalItems("student").filter((i) => i.mobile);
  return (
    <nav
      aria-label={t("portals.student")}
      className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {items.map((item) => {
        const href = `${portal.basePath}/${item.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}
          >
            <Icon className="size-5" aria-hidden />
            <span className="max-w-full truncate px-1">{t(item.titleKey)}</span>
          </Link>
        );
      })}
      <button type="button" onClick={() => openDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground">
        <MoreHorizontal className="size-5" aria-hidden />
        <span>{t("shell.more")}</span>
      </button>
    </nav>
  );
}
