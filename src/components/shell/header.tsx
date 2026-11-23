"use client";

import { Bot } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandPalette } from "./command-palette";
import { LanguageToggle } from "./language-toggle";
import { MobileDrawer } from "./mobile-drawer";
import { NotificationBell } from "./notification-bell";
import { usePortal } from "./portal-context";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

/** Top bar for every authenticated portal. */
export function Header() {
  const portal = usePortal();
  const t = useT();
  return (
    <header className="no-print sticky top-0 z-30 flex h-header items-center gap-1 border-b bg-background/85 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 sm:gap-2 sm:px-6">
      <MobileDrawer />
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <CommandPalette />
      {portal.key === "student" && (
        <Button size="sm" className="hidden sm:inline-flex" asChild>
          <Link href="/student/ai-tutor?new=1">
            <Bot /> {t("shell.askAi")}
          </Link>
        </Button>
      )}
      <div className="flex items-center">
        <LanguageToggle />
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
