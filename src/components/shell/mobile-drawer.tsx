"use client";

import { Menu } from "lucide-react";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useT } from "@/i18n";
import { useUiStore } from "@/stores";
import { usePortal } from "./portal-context";
import { SidebarNav } from "./sidebar-nav";

export function MobileDrawer() {
  const portal = usePortal();
  const open = useUiStore((state) => state.mobileSidebarOpen);
  const setOpen = useUiStore((state) => state.setMobileSidebarOpen);
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("shell.openMenu")}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
        <SheetHeader className="h-header justify-center border-b px-4">
          <SheetTitle className="sr-only">{t(portal.titleKey)}</SheetTitle>
          <Logo href={`${portal.basePath}/dashboard`} />
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
