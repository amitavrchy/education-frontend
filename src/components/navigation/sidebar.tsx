"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePortal } from "@/contexts/portal-context";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores";
import { SidebarNav } from "./sidebar-nav";

/** Desktop sidebar (lg and up). Mobile uses <MobileSidebar>. */
export function Sidebar() {
  const portal = usePortal();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div className={cn("flex h-header items-center border-b px-4", collapsed && "justify-center px-0")}>
        <Logo href={`${portal.basePath}/dashboard`} iconOnly={collapsed} />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <SidebarNav collapsed={collapsed} />
      </ScrollArea>

      <div className={cn("border-t p-3", collapsed && "flex justify-center")}>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(!collapsed && "w-full justify-start")}
          onClick={toggleSidebar}
          aria-label={collapsed ? "সাইডবার খুলুন" : "সাইডবার ছোট করুন"}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          {!collapsed && <span>ছোট করুন</span>}
        </Button>
      </div>
    </aside>
  );
}
