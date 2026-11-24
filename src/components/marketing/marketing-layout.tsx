"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/common/logo";
import { LanguageToggle } from "@/components/shell/language-toggle";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { marketingFooterNavigation, marketingNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { useCurrentUser } from "@/hooks/use-auth";
import { useL, useT } from "@/i18n";
import { portalForRole } from "@/lib/auth/permissions";
import { PORTAL_HOME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { WithChildren } from "@/types";

function Navbar() {
  const t = useT();
  const pathname = usePathname();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-header max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden flex-1 items-center gap-1 lg:flex">
          {marketingNavigation.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn("rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", pathname === link.href && "text-foreground")}
            >
              {t(link.titleKey)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          {user ? (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href={PORTAL_HOME[portalForRole(user.role)]}>{t("nav.dashboard")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.login}>{t("marketingNav.login")}</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.register}>{t("marketingNav.getStarted")}</Link>
              </Button>
            </>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("shell.openMenu")}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {[...marketingNavigation, ...marketingFooterNavigation.slice(0, 3)].map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
                    {t(link.titleKey)}
                  </Link>
                ))}
                <div className="mt-4 grid gap-2">
                  <Button asChild variant="outline">
                    <Link href={ROUTES.login}>{t("marketingNav.login")}</Link>
                  </Button>
                  <Button asChild>
                    <Link href={ROUTES.register}>{t("marketingNav.getStarted")}</Link>
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

function Footer() {
  const t = useT();
  const l = useL();
  const columns = [
    { title: l("প্রোডাক্ট", "Product"), links: [...marketingNavigation.slice(0, 2), { titleKey: "marketingNav.schools" as const, href: "/for-colleges" }] },
    { title: l("কাদের জন্য", "For"), links: marketingNavigation.slice(2, 5) },
    { title: l("সহায়তা", "Support"), links: marketingFooterNavigation },
  ];
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{l(siteConfig.tagline, "AI-powered learning for SSC and HSC students in Bangladesh")}</p>
          <p className="text-xs text-muted-foreground">{l("ডেমো সংস্করণ: সব একাডেমিক কনটেন্ট কৃত্রিম নমুনা; কোনো বোর্ডের সাথে সম্পৃক্ত নয়।", "Demo build: all academic content is synthetic; not affiliated with any education board.")}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-sm font-semibold">{col.title}</p>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={`${col.title}-${link.href}`}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {t(link.titleKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {siteConfig.copyrightYear} {siteConfig.name}
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: WithChildren) {
  const t = useT();
  return (
    <div className="flex min-h-svh flex-col">
      <a href="#main" className="sr-only z-50 rounded bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {t("shell.skipToContent")}
      </a>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
