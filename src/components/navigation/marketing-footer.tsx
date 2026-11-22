import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { marketingNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {marketingNavigation.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
              {link.title}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t py-4 text-center text-caption">
        © {siteConfig.name}. সর্বস্বত্ব সংরক্ষিত।
      </div>
    </footer>
  );
}
