"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { marketingNavigation } from "@/config/navigation";
import { ROUTES } from "@/lib/constants";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-header max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden flex-1 items-center gap-6 md:flex">
          {marketingNavigation.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.title}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href={ROUTES.login}>লগইন</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href={ROUTES.register}>শুরু করুন</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="মেনু খুলুন">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>মেনু</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {marketingNavigation.map((link) => (
                  <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    {link.title}
                  </Link>
                ))}
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="outline" asChild>
                    <Link href={ROUTES.login}>লগইন</Link>
                  </Button>
                  <Button asChild>
                    <Link href={ROUTES.register}>শুরু করুন</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
